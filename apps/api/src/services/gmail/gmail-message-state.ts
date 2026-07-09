import type { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma.js";

import { getAccessTokenForEmail } from "./gmail-auth.js";
import { fetchJson } from "./gmail-http.js";
import { sortGmailSearchCandidatesByDate } from "./gmail-message-parser.js";
import { type GmailMessageResponse, mapMessageCandidate } from "./gmail-message-utils.js";

export type GmailTrackedMessage = {
  id: string;
  subject: string;
  date: string;
};

function buildOpportunityScopedGmailMessageStateWhere(jobOpportunityId?: string | null) {
  if (!jobOpportunityId) {
    return {};
  }

  return {
    OR: [{ jobOpportunityId }, { jobOpportunityId: null }] satisfies Prisma.GmailMessageStateWhereInput[],
  };
}

async function getSuppressedGmailMessageIds(input: { auth0Email: string; jobOpportunityId: string }) {
  const states = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: { in: ["USED", "HIDDEN", "IGNORED"] },
      ...buildOpportunityScopedGmailMessageStateWhere(input.jobOpportunityId),
    },
    select: { messageId: true },
  });

  return new Set(states.map((state) => state.messageId));
}

async function markGmailMessageState(input: {
  auth0Email: string;
  messageId: string;
  status: "USED" | "HIDDEN" | "IGNORED";
  jobOpportunityId?: string | null;
}) {
  return prisma.gmailMessageState.upsert({
    where: {
      auth0Email_messageId: {
        auth0Email: input.auth0Email,
        messageId: input.messageId,
      },
    },
    create: input,
    update: { status: input.status, jobOpportunityId: input.jobOpportunityId ?? undefined },
  });
}

export async function hideGmailMessage(input: {
  auth0Email: string;
  messageId: string;
  jobOpportunityId?: string | null;
}) {
  await markGmailMessageState({ ...input, status: "HIDDEN" });
}

export async function restoreHiddenGmailMessage(input: {
  auth0Email: string;
  messageId: string;
  jobOpportunityId?: string | null;
}) {
  await prisma.gmailMessageState.deleteMany({
    where: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      status: "HIDDEN",
      ...buildOpportunityScopedGmailMessageStateWhere(input.jobOpportunityId),
    },
  });
}

export async function unmarkUsedGmailMessageState(input: {
  auth0Email: string;
  messageId: string;
  jobOpportunityId?: string | null;
}) {
  await prisma.gmailMessageState.deleteMany({
    where: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      status: "USED",
      ...buildOpportunityScopedGmailMessageStateWhere(input.jobOpportunityId),
    },
  });
}

export async function ignoreGmailMessage(input: {
  auth0Email: string;
  messageId: string;
  jobOpportunityId?: string | null;
}) {
  await markGmailMessageState({ ...input, status: "IGNORED" });
}

export async function unignoreGmailMessage(input: { auth0Email: string; messageId: string }) {
  await prisma.gmailMessageState.deleteMany({
    where: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      status: "IGNORED",
    },
  });
}

export async function listTrackedGmailMessages(input: { auth0Email: string; jobOpportunityId: string }) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const states = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: { in: ["USED", "HIDDEN", "IGNORED"] },
      ...buildOpportunityScopedGmailMessageStateWhere(input.jobOpportunityId),
    },
    orderBy: { updatedAt: "desc" },
    select: { messageId: true, status: true },
  });
  const removedEmails: GmailTrackedMessage[] = [];
  const pickedEmails: GmailTrackedMessage[] = [];
  const ignoredEmails: GmailTrackedMessage[] = [];

  for (const state of states) {
    const detailParams = new URLSearchParams();
    detailParams.set("format", "metadata");
    detailParams.append("metadataHeaders", "Subject");
    detailParams.append("metadataHeaders", "Date");

    try {
      const detail = await fetchJson<GmailMessageResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${state.messageId}?${detailParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${access.accessToken}` },
        }
      );
      const candidate = mapMessageCandidate({
        ...detail,
        id: detail.id ?? state.messageId,
      });
      const trackedMessage = {
        id: candidate.id,
        subject: candidate.subject,
        date: candidate.date,
      };

      if (state.status === "HIDDEN") {
        removedEmails.push(trackedMessage);
      } else if (state.status === "IGNORED") {
        ignoredEmails.push(trackedMessage);
      } else {
        pickedEmails.push(trackedMessage);
      }
    } catch {
      // Ignore message metadata fetch failures for deleted/expired mail.
    }
  }

  return {
    removedEmails: sortGmailSearchCandidatesByDate(removedEmails),
    pickedEmails: sortGmailSearchCandidatesByDate(pickedEmails),
    ignoredEmails: sortGmailSearchCandidatesByDate(ignoredEmails),
  };
}

export async function listAllIgnoredGmailMessages(input: { auth0Email: string }) {
  const access = await getAccessTokenForEmail(input.auth0Email);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const states = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: "IGNORED",
    },
    orderBy: { updatedAt: "desc" },
    select: { messageId: true, jobOpportunityId: true },
  });

  const ignoredEmails: Array<GmailTrackedMessage & { opportunityId: string | null }> = [];

  for (const state of states) {
    const detailParams = new URLSearchParams();
    detailParams.set("format", "metadata");
    detailParams.append("metadataHeaders", "Subject");
    detailParams.append("metadataHeaders", "Date");

    try {
      const detail = await fetchJson<GmailMessageResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${state.messageId}?${detailParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${access.accessToken}` },
        }
      );
      const candidate = mapMessageCandidate({
        ...detail,
        id: detail.id ?? state.messageId,
      });
      ignoredEmails.push({
        id: candidate.id,
        subject: candidate.subject,
        date: candidate.date,
        opportunityId: state.jobOpportunityId,
      });
    } catch {
      // Ignore message metadata fetch failures for deleted/expired mail.
    }
  }

  return sortGmailSearchCandidatesByDate(ignoredEmails);
}

export { buildOpportunityScopedGmailMessageStateWhere };
