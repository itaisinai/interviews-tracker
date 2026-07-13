import { z } from "zod";

import { createTimer, logInfo } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import {
  gmailEmailClassificationSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
} from "../../lib/schemas.js";
import { promoteOverdueInteractionStatusForRead } from "../../repositories/interaction-read-normalizer.js";
import { getAiParserService } from "../ai/ai-parser-service.js";

import { fetchGmailAttachment, getAccessTokenForEmail } from "./gmail-auth.js";
import { fetchJson } from "./gmail-http.js";
import {
  buildGmailSearchQueries,
  buildRelatedSenderDomainSearchQueries,
  classifySearchCandidateFallback,
  deriveInteractionFromStructuredEmail,
  parseStructuredGmailEmail,
  sortGmailSearchCandidatesByDate,
} from "./gmail-message-parser.js";
import { buildOpportunityScopedGmailMessageStateWhere } from "./gmail-message-state.js";
import {
  type GmailListResponse,
  type GmailMessageResponse,
  headerValue,
  mapMessageCandidate,
  senderDomainFromHeader,
} from "./gmail-message-utils.js";

export async function searchGmailMessages(input: {
  auth0Email: string;
  jobOpportunityId: string;
  companyName: string;
  companySearchName?: string | null;
  roleTitle?: string | null;
  companyDomains?: Array<string | null | undefined>;
}) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const timer = createTimer("gmail", "search emails", { company: input.companyName });
  const queries = buildGmailSearchQueries(
    input.companyName,
    input.roleTitle,
    [input.companySearchName],
    input.companyDomains ?? []
  );
  try {
    const messageMap = new Map<string, GmailMessageResponse & { query: string }>();
    const suppressedMessageIds = await (async () => {
      const states = await prisma.gmailMessageState.findMany({
        where: {
          auth0Email: input.auth0Email,
          status: { in: ["USED", "HIDDEN", "IGNORED"] },
          ...buildOpportunityScopedGmailMessageStateWhere(input.jobOpportunityId),
        },
        select: { messageId: true },
      });

      return new Set(states.map((state) => state.messageId));
    })();

    const fetchMessagesForQuery = async (query: string) => {
      const listResponse = await fetchJson<GmailListResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
          q: query,
          maxResults: "50",
          includeSpamTrash: "false",
        }).toString()}`,
        {
          headers: { Authorization: `Bearer ${access.accessToken}` },
        }
      );

      const listMessages = (listResponse.messages ?? []).filter(
        (message): message is { id: string; threadId?: string } => Boolean(message.id)
      );

      for (const message of listMessages) {
        if (messageMap.has(message.id) || suppressedMessageIds.has(message.id)) {
          continue;
        }

        const detailParams = new URLSearchParams();
        detailParams.set("format", "metadata");
        detailParams.append("metadataHeaders", "Subject");
        detailParams.append("metadataHeaders", "From");
        detailParams.append("metadataHeaders", "Date");
        const detail = await fetchJson<GmailMessageResponse>(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams.toString()}`,
          {
            headers: { Authorization: `Bearer ${access.accessToken}` },
          }
        );

        messageMap.set(message.id, {
          ...detail,
          threadId: detail.threadId ?? message.threadId ?? "",
          query,
        });
      }
    };

    for (const query of queries) {
      await fetchMessagesForQuery(query);
    }

    const relatedDomainQueries = buildRelatedSenderDomainSearchQueries(
      input.companyName,
      Array.from(messageMap.values()).map((message) =>
        senderDomainFromHeader(headerValue(message.payload?.headers, "From"))
      ),
      [input.companySearchName]
    ).filter((query) => !queries.includes(query));

    for (const query of relatedDomainQueries) {
      await fetchMessagesForQuery(query);
    }

    const executedQueries = [...queries, ...relatedDomainQueries];

    const candidates = Array.from(messageMap.values()).map((message) => {
      const candidate = mapMessageCandidate(message);
      return {
        ...candidate,
        threadId: candidate.threadId || message.threadId || "",
        relevance: classifySearchCandidateFallback({
          messageId: candidate.id,
          companyName: input.companyName,
          companyAliases: [input.companySearchName],
          roleTitle: input.roleTitle ?? null,
          subject: candidate.subject,
          from: candidate.from,
          snippet: candidate.snippet,
          date: candidate.date,
          senderDomain: senderDomainFromHeader(candidate.from),
          searchQuery: message.query,
        }),
      };
    });

    let classifications: Array<z.infer<typeof gmailEmailClassificationSchema>> = [];

    try {
      classifications = await getAiParserService().classifyGmailEmails({
        companyName: input.companyName,
        roleTitle: input.roleTitle ?? null,
        candidates: candidates.map((candidate) => ({
          messageId: candidate.id,
          subject: candidate.subject,
          from: candidate.from,
          snippet: candidate.snippet,
          date: candidate.date,
          senderDomain: senderDomainFromHeader(candidate.from),
        })),
      });
    } catch (error) {
      logInfo("gmail", "candidate classification fallback", {
        company: input.companyName,
        error: error instanceof Error ? error.message : "unknown",
      });
    }

    const classificationMap = new Map(classifications.map((item) => [item.messageId, item]));
    const rankedCandidates = sortGmailSearchCandidatesByDate(
      candidates.map((candidate) => ({
        ...candidate,
        relevance: classificationMap.get(candidate.id) ?? candidate.relevance,
      }))
    );

    timer.end({ candidates: rankedCandidates.length, queries: executedQueries.length });
    return {
      companyName: input.companyName,
      roleTitle: input.roleTitle ?? null,
      query: executedQueries.join(" | "),
      candidates: rankedCandidates,
    };
  } catch (error) {
    timer.fail(error, { company: input.companyName });
    throw error;
  }
}

export async function findGmailOpportunityCandidates(input: {
  auth0Email: string;
  pageToken?: string | null;
  maxResults?: number;
  includeSupressed?: boolean;
}) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const maxResults = Math.min(Math.max(input.maxResults ?? 50, 5), 50);
  const query = [
    "newer_than:180d",
    "(recruiter OR hiring OR founder OR co-founder OR opportunity OR role OR position OR job)",
    "-category:promotions",
    "-category:updates",
    "-from:noreply",
    "-from:no-reply",
    "-from:donotreply",
    "-from:notifications@",
    "-from:calendar-notification@",
    "-from:notification@",
    "-subject:reminder",
    "-subject:notification",
    "-subject:alert",
    "-subject:error",
    "-subject:invited",
    "-subject:invitation",
  ].join(" ");

  // Get already processed emails to filter them out (or just track their status if includeSupressed=true)
  const messageStates = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: { in: ["USED", "HIDDEN", "IGNORED"] },
    },
    select: {
      messageId: true,
      status: true,
      jobOpportunityId: true,
    },
  });

  // Get opportunity slugs for USED messages
  const opportunityIds = [
    ...new Set(messageStates.map((s) => s.jobOpportunityId).filter((id): id is string => id !== null)),
  ];
  const opportunities = await prisma.jobOpportunity.findMany({
    where: { id: { in: opportunityIds } },
    select: { id: true, slug: true },
  });
  const opportunitySlugById = new Map(opportunities.map((opp) => [opp.id, opp.slug]));

  console.log(
    `[Gmail Search] Found ${messageStates.length} suppressed messages (USED/HIDDEN/IGNORED) for ${input.auth0Email}${input.includeSupressed ? " - including them in results" : ""}`
  );

  const suppressedMessageIds = new Set(messageStates.map((state) => state.messageId));
  const messageStatusMap = new Map(messageStates.map((state) => [state.messageId, state.status]));
  const messageOpportunitySlugMap = new Map(
    messageStates.map((state) => [
      state.messageId,
      state.jobOpportunityId ? (opportunitySlugById.get(state.jobOpportunityId) ?? null) : null,
    ])
  );

  const params = new URLSearchParams({ q: query, maxResults: String(maxResults), includeSpamTrash: "false" });
  if (input.pageToken) params.set("pageToken", input.pageToken);

  const listResponse = await fetchJson<GmailListResponse & { nextPageToken?: string }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
    { headers: { Authorization: `Bearer ${access.accessToken}` } }
  );

  console.log(`[Gmail Search] Gmail API returned ${listResponse.messages?.length ?? 0} messages`);

  const candidates = [];
  for (const message of listResponse.messages ?? []) {
    if (!message.id) continue;

    const isSuppressed = suppressedMessageIds.has(message.id);
    const suppressionStatus = messageStatusMap.get(message.id);

    // Skip already processed emails (unless includeSupressed is true)
    if (isSuppressed && !input.includeSupressed) {
      console.log(
        `[Gmail Search] ❌ SUPPRESSED message ${message.id} (status: ${suppressionStatus}) - hiding from results`
      );
      continue;
    }

    if (isSuppressed) {
      console.log(
        `[Gmail Search] ⚠️  SUPPRESSED message ${message.id} (status: ${suppressionStatus}) - including due to includeSupressed=true`
      );
    }

    const detailParams = new URLSearchParams();
    detailParams.set("format", "metadata");
    detailParams.append("metadataHeaders", "Subject");
    detailParams.append("metadataHeaders", "From");
    detailParams.append("metadataHeaders", "Date");
    const detail = await fetchJson<GmailMessageResponse>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams.toString()}`,
      { headers: { Authorization: `Bearer ${access.accessToken}` } }
    );
    const candidate = mapMessageCandidate({ ...detail, threadId: detail.threadId ?? message.threadId ?? "" });
    console.log(
      `[Gmail Search] ✅ KEPT message: ${candidate.subject} (from: ${candidate.from})${suppressionStatus ? ` [${suppressionStatus}]` : ""}`
    );
    candidates.push({
      ...candidate,
      suppressionStatus: suppressionStatus ?? null,
      usedInOpportunitySlug: suppressionStatus === "USED" ? (messageOpportunitySlugMap.get(message.id) ?? null) : null,
      relevance: classifySearchCandidateFallback({
        messageId: candidate.id,
        companyName: "job opportunity",
        companyAliases: [],
        roleTitle: null,
        subject: candidate.subject,
        from: candidate.from,
        snippet: candidate.snippet,
        date: candidate.date,
        senderDomain: senderDomainFromHeader(candidate.from),
        searchQuery: query,
      }),
    });
  }

  console.log(`[Gmail Search] Collected ${candidates.length} candidates before AI classification`);

  // Use AI to classify and filter candidates (unless includeSupressed is true)
  let classifications: Array<z.infer<typeof gmailEmailClassificationSchema>> = [];

  // IMPORTANT: If includeSupressed=true, skip AI classification entirely
  // User wants to see EVERYTHING, not just "relevant" emails
  if (input.includeSupressed) {
    console.log(`[Gmail Search] Skipping AI classification because includeSupressed=true - showing all emails`);
  } else {
    try {
      classifications = await getAiParserService().classifyGmailEmails({
        companyName: "job opportunity",
        roleTitle: null,
        candidates: candidates.map((candidate) => ({
          messageId: candidate.id,
          subject: candidate.subject,
          from: candidate.from,
          snippet: candidate.snippet,
          date: candidate.date,
          senderDomain: senderDomainFromHeader(candidate.from),
        })),
      });
    } catch (error) {
      logInfo("gmail", "opportunity candidate classification fallback", {
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  const classificationMap = new Map(classifications.map((item) => [item.messageId, item]));
  const rankedCandidates = sortGmailSearchCandidatesByDate(
    candidates
      .map((candidate) => ({
        ...candidate,
        relevance: classificationMap.get(candidate.id) ?? candidate.relevance,
      }))
      // Filter out non-relevant emails (notifications, reminders, errors)
      .filter((candidate) => {
        // IMPORTANT: If this email has a suppressionStatus (USED/HIDDEN/IGNORED),
        // it was already classified when first processed. Don't re-filter it!
        if (candidate.suppressionStatus) {
          console.log(
            `[Gmail Search] ✅ KEEPING suppressed email (already classified): ${candidate.subject} [${candidate.suppressionStatus}]`
          );
          return true;
        }

        const classification = classificationMap.get(candidate.id);
        // If we have AI classification, use it; otherwise keep the candidate
        if (!classification) return true;

        // Filter out explicitly non-relevant emails and those with UNRELATED type
        if (classification.isRelevant === false || classification.emailType === "UNRELATED") {
          console.log(
            `[Gmail Search] ❌ AI FILTERED OUT: ${candidate.subject} (isRelevant: ${classification.isRelevant}, emailType: ${classification.emailType})`
          );
          return false;
        }

        // Filter out very low confidence matches (< 0.3)
        if (classification.confidence < 0.3) {
          console.log(
            `[Gmail Search] ❌ AI FILTERED OUT (low confidence): ${candidate.subject} (confidence: ${classification.confidence})`
          );
          return false;
        }

        console.log(
          `[Gmail Search] ✅ AI KEPT: ${candidate.subject} (confidence: ${classification.confidence}, emailType: ${classification.emailType})`
        );

        return true;
      })
  );

  console.log(`[Gmail Search] Final result: ${rankedCandidates.length} candidates after AI filtering`);

  return {
    companyName: "Gmail",
    roleTitle: null,
    query,
    candidates: rankedCandidates,
    nextPageToken: listResponse.nextPageToken ?? null,
  };
}

export async function parseGmailEmailToOpportunity(input: { auth0Email: string; messageId: string }) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const detail = await fetchJson<GmailMessageResponse>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?${new URLSearchParams({ format: "full" }).toString()}`,
    { headers: { Authorization: `Bearer ${access.accessToken}` } }
  );
  const email = await parseStructuredGmailEmail({
    message: detail,
    attachmentFetcher: async (messageId, attachmentId) => {
      const attachment = await fetchGmailAttachment(messageId, attachmentId, access.accessToken);
      if (!attachment.data) return "";
      return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    },
  });

  const text = [
    `Subject: ${email.subject}`,
    `From: ${email.fromRaw}`,
    `Date: ${email.dateHeader ?? email.internalDate}`,
    email.snippet ? `Snippet: ${email.snippet}` : null,
    email.plainText || email.htmlText || email.calendarText,
  ]
    .filter(Boolean)
    .join("\n\n");

  const parsed = await getAiParserService().parseJobDescription(text);

  // Mark the email as USED so it doesn't appear in future searches
  await prisma.gmailMessageState.upsert({
    where: {
      auth0Email_messageId: {
        auth0Email: input.auth0Email,
        messageId: input.messageId,
      },
    },
    create: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      jobOpportunityId: null,
      status: "USED",
    },
    update: { status: "USED" },
  });

  return { email, parsed };
}

export async function syncAttachedGmailInteractionData(input: { auth0Email: string; jobOpportunityId: string }) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const interactions = await prisma.interaction.findMany({
    where: {
      jobOpportunityId: input.jobOpportunityId,
      gmailMessageId: { not: null },
    },
    select: { id: true, gmailMessageId: true, endDate: true },
  });
  let updatedInteractions = 0;
  let scannedMessages = 0;

  for (const interaction of interactions) {
    if (!interaction.gmailMessageId) {
      continue;
    }

    scannedMessages += 1;

    try {
      const detail = await fetchJson<GmailMessageResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${interaction.gmailMessageId}?${new URLSearchParams({
          format: "full",
        }).toString()}`,
        {
          headers: { Authorization: `Bearer ${access.accessToken}` },
        }
      );
      const email = await parseStructuredGmailEmail({
        message: detail,
        attachmentFetcher: async (messageId, attachmentId) => {
          const attachment = await fetchGmailAttachment(messageId, attachmentId, access.accessToken);
          if (!attachment.data) {
            return "";
          }
          return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
        },
      });
      const derived = deriveInteractionFromStructuredEmail(email);

      if (!interaction.endDate && derived.endDate) {
        await prisma.interaction.update({
          where: { id: interaction.id },
          data: { endDate: new Date(derived.endDate) },
        });
        updatedInteractions += 1;
      }
    } catch (error) {
      logInfo("gmail", "attached interaction sync skipped message", {
        interactionId: interaction.id,
        messageId: interaction.gmailMessageId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
  }

  return {
    scannedMessages,
    updatedInteractions,
  };
}

export async function parseGmailEmailToInteraction(input: {
  auth0Email: string;
  companyName: string;
  roleTitle?: string | null;
  messageId: string;
  jobOpportunityId?: string | null;
}) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const timer = createTimer("gmail", "parse email", { company: input.companyName, messageId: input.messageId });
  try {
    const detail = await fetchJson<GmailMessageResponse>(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?${new URLSearchParams({
        format: "full",
      }).toString()}`,
      {
        headers: { Authorization: `Bearer ${access.accessToken}` },
      }
    );
    const email = await parseStructuredGmailEmail({
      message: detail,
      attachmentFetcher: async (messageId, attachmentId) => {
        const attachment = await fetchGmailAttachment(messageId, attachmentId, access.accessToken);
        if (!attachment.data) {
          return "";
        }
        return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      },
    });

    const derived = deriveInteractionFromStructuredEmail(email);
    logInfo("gmail", "email parsed structured data ready", {
      company: input.companyName,
      subject: email.subject,
      dateSource: derived.dateSource,
    });

    const aiInteraction = await getAiParserService().parseStructuredGmailEmailToInteraction({
      companyName: input.companyName,
      roleTitle: input.roleTitle ?? null,
      email,
      derived,
    });

    const parsedInteraction = gmailInteractionDraftSchema.parse({
      ...aiInteraction,
      date: aiInteraction.date?.trim() ? aiInteraction.date : derived.date,
      endDate: aiInteraction.endDate?.trim() ? aiInteraction.endDate : derived.endDate,
      meetingLink: aiInteraction.meetingLink ?? derived.meetingLink,
      gmailMessageId: input.messageId,
      notes: [derived.notes, aiInteraction.notes].filter(Boolean).join("\n\n") || null,
    });

    const analysis = gmailEmailExtractionAnalysisSchema.parse({
      dateSource: derived.dateSource,
      stageSource: derived.stage ? (derived.stage === "Interview" ? "generic" : "explicit") : "null",
      typeSource: "derived",
      statusSource: derived.dateSource,
      hasCalendar: Boolean(email.calendar),
      notes: [
        `Date source: ${derived.dateSource}`,
        email.calendar?.summary ? `Calendar summary: ${email.calendar.summary}` : null,
        email.calendar?.location ? `Calendar location: ${email.calendar.location}` : null,
        email.calendar?.start ? `Calendar start: ${email.calendar.start}` : null,
        email.calendar?.end ? `Calendar end: ${email.calendar.end}` : null,
      ].filter(Boolean) as string[],
    });

    await prisma.gmailMessageState.upsert({
      where: {
        auth0Email_messageId: {
          auth0Email: input.auth0Email,
          messageId: input.messageId,
        },
      },
      create: {
        auth0Email: input.auth0Email,
        messageId: input.messageId,
        jobOpportunityId: input.jobOpportunityId ?? null,
        status: "USED",
      },
      update: { status: "USED", jobOpportunityId: input.jobOpportunityId ?? null },
    });

    timer.end({ company: input.companyName });
    return {
      email,
      interaction: promoteOverdueInteractionStatusForRead(parsedInteraction),
      analysis,
    };
  } catch (error) {
    timer.fail(error, { company: input.companyName });
    throw error;
  }
}
