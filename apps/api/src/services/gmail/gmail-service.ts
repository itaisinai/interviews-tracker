import {
  buildGmailSearchQueries,
  buildRelatedSenderDomainSearchQueries,
  classifySearchCandidateFallback,
  deriveInteractionFromStructuredEmail,
  parseStructuredGmailEmail,
  sortGmailSearchCandidatesByDate
} from "./gmail-message-parser.js";
import { createTimer, logInfo } from "../../lib/logger.js";
import {
  gmailEmailClassificationSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
  gmailMessageCandidateSchema,
  gmailSearchCandidateSchema,
  gmailStructuredEmailSchema
} from "../../lib/schemas.js";

import crypto from "node:crypto";
import { getAiParserService } from "../ai/ai-parser-service.js";
import { prisma } from "../../lib/prisma.js";
import { promoteOverdueInteractionStatusForRead } from "../../repositories/interaction-read-normalizer.js";
import { z } from "zod";

type GmailSettings = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionSecret: string;
  frontendOrigin: string;
};

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GmailOAuthTokenBundle = {
  access_token: string;
  refresh_token: string;
  scope?: string;
};

type GmailProfileResponse = {
  emailAddress?: string;
};

type GmailListResponse = {
  messages?: Array<{
    id?: string;
    threadId?: string;
  }>;
};

type GmailMessageHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePayload = {
  mimeType?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePayload[];
  headers?: GmailMessageHeader[];
};

type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
};

type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

type GmailStatePayload = {
  auth0Email: string;
  returnTo: string;
  expiresAt: number;
  nonce: string;
};

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  updatedAt: string | null;
};

export type GmailMessageCandidate = z.infer<typeof gmailMessageCandidateSchema>;

export type GmailSearchCandidate = z.infer<typeof gmailSearchCandidateSchema>;

export type GmailStructuredEmail = z.infer<typeof gmailStructuredEmailSchema>;

export type GmailTrackedMessage = Pick<GmailMessageCandidate, "id" | "subject" | "date">;

export type GmailEmailClassification = z.infer<typeof gmailEmailClassificationSchema>;

export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;

export type GmailParsedInteraction = z.infer<typeof gmailInteractionDraftSchema>;

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const STATE_TTL_MS = 10 * 60 * 1000;

function getFirstFrontendOrigin() {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean) ?? "http://localhost:5173";
}

function getSettings(): GmailSettings | null {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const encryptionSecret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !redirectUri || !encryptionSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    encryptionSecret,
    frontendOrigin: getFirstFrontendOrigin()
  };
}

function requireSettings() {
  const settings = getSettings();

  if (!settings) {
    throw new Error("Gmail OAuth is not configured.");
  }

  return settings;
}

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptText(value: string, secret: string) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptText(value: string, secret: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted Gmail token.");
  }

  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivPart, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, "base64url")),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}

function signState(payload: GmailStatePayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", deriveKey(secret)).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyState(state: string, secret: string): GmailStatePayload {
  const [body, signature] = state.split(".");

  if (!body || !signature) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  const expected = crypto.createHmac("sha256", deriveKey(secret)).update(body).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<GmailStatePayload>;

  if (
    typeof parsed.auth0Email !== "string" ||
    typeof parsed.returnTo !== "string" ||
    typeof parsed.expiresAt !== "number" ||
    typeof parsed.nonce !== "string"
  ) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  if (Date.now() > parsed.expiresAt) {
    throw new Error("Gmail OAuth state expired.");
  }

  return {
    auth0Email: parsed.auth0Email,
    returnTo: parsed.returnTo,
    expiresAt: parsed.expiresAt,
    nonce: parsed.nonce
  };
}

function normalizeReturnTo(returnTo?: string) {
  if (!returnTo) {
    return "/";
  }

  if (returnTo.startsWith("/")) {
    return returnTo;
  }

  try {
    const url = new URL(returnTo);
    const frontendOrigin = getFirstFrontendOrigin();

    if (`${url.origin}` === frontendOrigin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // fall through
  }

  return "/";
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Gmail API request failed: ${response.status} ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

async function exchangeCodeForTokens(code: string, settings: GmailSettings): Promise<GmailOAuthTokenBundle> {
  const response = await fetchJson<GmailTokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.access_token || !response.refresh_token) {
    throw new Error("Gmail OAuth did not return a refresh token.");
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    scope: response.scope
  };
}

async function refreshAccessToken(refreshToken: string, settings: GmailSettings): Promise<string> {
  const response = await fetchJson<GmailTokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      grant_type: "refresh_token"
    })
  });

  const accessToken = response.access_token;

  if (!accessToken) {
    throw new Error("Unable to refresh Gmail access token.");
  }

  return accessToken;
}

async function fetchGmailProfile(accessToken: string) {
  return fetchJson<GmailProfileResponse>("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function fetchGmailAttachment(messageId: string, attachmentId: string, accessToken: string) {
  return fetchJson<GmailAttachmentResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function getAccessTokenForEmail(auth0Email: string, settings = requireSettings()) {
  const connection = await prisma.gmailConnection.findUnique({ where: { auth0Email } });

  if (!connection) {
    return null;
  }

  const refreshToken = decryptText(connection.refreshTokenEncrypted, settings.encryptionSecret);
  const accessToken = await refreshAccessToken(refreshToken, settings);

  return { accessToken, connection };
}

function headerValue(headers: GmailMessageHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function senderDomainFromHeader(value: string) {
  const match = value.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/p>|<\/div>|<\/li>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n");
}

function extractPayloadText(payload?: GmailMessagePayload): string {
  if (!payload) {
    return "";
  }

  const parts = payload.parts ?? [];

  for (const part of parts) {
    const text = extractPayloadText(part);
    if (text.trim().length > 0 && part.mimeType === "text/plain") {
      return text;
    }
  }

  for (const part of parts) {
    const text = extractPayloadText(part);
    if (text.trim().length > 0) {
      return text;
    }
  }

  const data = payload.body?.data;

  if (!data) {
    return "";
  }

  const decoded = decodeBase64Url(data);

  if (payload.mimeType === "text/html") {
    return stripHtml(decoded).trim();
  }

  return decoded.trim();
}

function parseInternalDate(value?: string) {
  const timestamp = Number(value);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp).toISOString();
  }

  return new Date().toISOString();
}

function parseTimeComponent(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();

  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return null;
  }

  if (meridiem === "AM") {
    hour = hour === 12 ? 0 : hour;
  } else {
    hour = hour === 12 ? 12 : hour + 12;
  }

  return { hour, minute };
}

function monthIndexFromName(value: string) {
  const normalized = value.trim().slice(0, 3).toLowerCase();
  const months: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11
  };

  return months[normalized] ?? -1;
}

function parseTimezoneOffset(value: string) {
  const explicitMatch = value.match(/GMT\s*([+-]\s*\d{1,2})/i) ?? value.match(/\bUTC\s*([+-]\s*\d{1,2})/i);

  if (explicitMatch?.[1]) {
    return Number(explicitMatch[1].replace(/\s+/g, ""));
  }

  if (/Israel Time|Asia\/Jerusalem|IDT/i.test(value)) {
    return 3;
  }

  if (/\bIST\b/i.test(value)) {
    return 3;
  }

  return null;
}

function localTimeToIso(parts: { year: number; month: number; day: number; hour: number; minute: number }, offsetHours: number) {
  const utcMillis = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour - offsetHours, parts.minute);
  return new Date(utcMillis).toISOString();
}

function extractDateComponents(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b,?\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:[^\d]+)?(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))?(?:\s*\(([^)]+)\))?/i,
    /(?:on\s+)?([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})(?:[^\d]+)?(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))?(?:\s*\(([^)]+)\))?/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (!match) {
      continue;
    }

    const dateParts = match.slice(1, 4);
    const timePart = match[4];
    const timezonePart = match[5] ?? "";
    const dateMatch = dateParts.length === 3 ? dateParts : null;
    const timeMatch = parseTimeComponent(timePart);

    if (!dateMatch || !timeMatch) {
      continue;
    }

    let year: number;
    let month: number;
    let day: number;

    if (/^\d{1,2}$/.test(dateMatch[0] ?? "")) {
      day = Number(dateMatch[0]);
      month = monthIndexFromName(dateMatch[1] ?? "") + 1;
      year = Number(dateMatch[2]);
    } else {
      month = monthIndexFromName(dateMatch[0] ?? "") + 1;
      day = Number(dateMatch[1]);
      year = Number(dateMatch[2]);
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      continue;
    }

    const offsetHours = parseTimezoneOffset(timezonePart);

    if (offsetHours === null) {
      continue;
    }

    return localTimeToIso(
      {
        year,
        month,
        day,
        hour: timeMatch.hour,
        minute: timeMatch.minute
      },
      offsetHours
    );
  }

  return null;
}

function mapMessageCandidate(message: GmailMessageResponse): GmailMessageCandidate {
  const headers = message.payload?.headers ?? [];

  return gmailMessageCandidateSchema.parse({
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    subject: headerValue(headers, "Subject") || "(No subject)",
    from: headerValue(headers, "From") || "Unknown sender",
    date: parseInternalDate(message.internalDate),
    snippet: message.snippet?.trim() || "(No snippet available)"
  });
}

async function getSuppressedGmailMessageIds(input: { auth0Email: string; jobOpportunityId: string }) {
  const states = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: { in: ["USED", "HIDDEN"] },
      jobOpportunityId: input.jobOpportunityId
    },
    select: { messageId: true }
  });

  return new Set(states.map((state) => state.messageId));
}

async function markGmailMessageState(input: { auth0Email: string; messageId: string; status: "USED" | "HIDDEN"; jobOpportunityId?: string | null }) {
  return prisma.gmailMessageState.upsert({
    where: {
      auth0Email_messageId: {
        auth0Email: input.auth0Email,
        messageId: input.messageId
      }
    },
    create: input,
    update: { status: input.status, jobOpportunityId: input.jobOpportunityId ?? undefined }
  });
}

export async function hideGmailMessage(input: { auth0Email: string; messageId: string; jobOpportunityId?: string | null }) {
  await markGmailMessageState({ ...input, status: "HIDDEN" });
}

export async function restoreHiddenGmailMessage(input: { auth0Email: string; messageId: string }) {
  await prisma.gmailMessageState.deleteMany({
    where: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      status: "HIDDEN"
    }
  });
}

export async function unmarkUsedGmailMessageState(input: { auth0Email: string; messageId: string; jobOpportunityId?: string | null }) {
  await prisma.gmailMessageState.deleteMany({
    where: {
      auth0Email: input.auth0Email,
      messageId: input.messageId,
      status: "USED",
      jobOpportunityId: input.jobOpportunityId ?? undefined
    }
  });
}

export async function listTrackedGmailMessages(input: { auth0Email: string; jobOpportunityId: string }) {
  const settings = requireSettings();
  const access = await getAccessTokenForEmail(input.auth0Email, settings);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const states = await prisma.gmailMessageState.findMany({
    where: {
      auth0Email: input.auth0Email,
      status: { in: ["USED", "HIDDEN"] },
      jobOpportunityId: input.jobOpportunityId
    },
    orderBy: { updatedAt: "desc" },
    select: { messageId: true, status: true }
  });
  const removedEmails: GmailTrackedMessage[] = [];
  const pickedEmails: GmailTrackedMessage[] = [];

  for (const state of states) {
    const detailParams = new URLSearchParams();
    detailParams.set("format", "metadata");
    detailParams.append("metadataHeaders", "Subject");
    detailParams.append("metadataHeaders", "Date");

    try {
      const detail = await fetchJson<GmailMessageResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${state.messageId}?${detailParams.toString()}`, {
        headers: { Authorization: `Bearer ${access.accessToken}` }
      });
      const candidate = mapMessageCandidate({
        ...detail,
        id: detail.id ?? state.messageId
      });
      const trackedMessage = {
        id: candidate.id,
        subject: candidate.subject,
        date: candidate.date
      };

      if (state.status === "HIDDEN") {
        removedEmails.push(trackedMessage);
      } else {
        pickedEmails.push(trackedMessage);
      }
    } catch (error) {
      logInfo("gmail", "tracked message metadata unavailable", { messageId: state.messageId, error: error instanceof Error ? error.message : "unknown" });
    }
  }

  return {
    removedEmails: sortGmailSearchCandidatesByDate(removedEmails),
    pickedEmails: sortGmailSearchCandidatesByDate(pickedEmails)
  };
}

export function createGmailAuthUrl(auth0Email: string, returnTo?: string) {
  const settings = requireSettings();
  const state = signState(
    {
      auth0Email,
      returnTo: normalizeReturnTo(returnTo),
      expiresAt: Date.now() + STATE_TTL_MS,
      nonce: crypto.randomBytes(16).toString("base64url")
    },
    settings.encryptionSecret
  );

  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: auth0Email,
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getGmailStatus(auth0Email: string): Promise<GmailStatus> {
  const settings = getSettings();

  if (!settings) {
    return {
      configured: false,
      connected: false,
      googleEmail: null,
      updatedAt: null
    };
  }

  const connection = await prisma.gmailConnection.findUnique({ where: { auth0Email } });

  return {
    configured: true,
    connected: Boolean(connection),
    googleEmail: connection?.googleEmail ?? null,
    updatedAt: connection?.updatedAt?.toISOString() ?? null
  };
}

export async function completeGmailOAuth(code: string, state: string) {
  const settings = requireSettings();
  const timer = createTimer("gmail", "connect", {});
  try {
    const parsedState = verifyState(state, settings.encryptionSecret);
    const tokens = await exchangeCodeForTokens(code, settings);
    const refreshToken = tokens.refresh_token;
    const profile = await fetchGmailProfile(tokens.access_token);

    await prisma.gmailConnection.upsert({
      where: { auth0Email: parsedState.auth0Email },
      create: {
        auth0Email: parsedState.auth0Email,
        googleEmail: profile.emailAddress ?? null,
        refreshTokenEncrypted: encryptText(refreshToken, settings.encryptionSecret),
        scope: tokens.scope ?? GMAIL_SCOPE
      },
      update: {
        googleEmail: profile.emailAddress ?? null,
        refreshTokenEncrypted: encryptText(refreshToken, settings.encryptionSecret),
        scope: tokens.scope ?? GMAIL_SCOPE
      }
    });

    const redirectTo = new URL(parsedState.returnTo, settings.frontendOrigin).toString();
    timer.end({ email: parsedState.auth0Email });
    return { redirectTo };
  } catch (error) {
    timer.fail(error);
    throw error;
  }
}

export async function searchGmailMessages(input: { auth0Email: string; jobOpportunityId: string; companyName: string; companySearchName?: string | null; roleTitle?: string | null }) {
  const settings = requireSettings();
  const access = await getAccessTokenForEmail(input.auth0Email, settings);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const timer = createTimer("gmail", "search emails", { company: input.companyName });
  const queries = buildGmailSearchQueries(input.companyName, input.roleTitle, [input.companySearchName]);
  try {
    const messageMap = new Map<string, GmailMessageResponse & { query: string }>();
    const suppressedMessageIds = await getSuppressedGmailMessageIds({
      auth0Email: input.auth0Email,
      jobOpportunityId: input.jobOpportunityId
    });

    const fetchMessagesForQuery = async (query: string) => {
      const listResponse = await fetchJson<GmailListResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${new URLSearchParams({
        q: query,
        maxResults: "10",
        includeSpamTrash: "false"
      }).toString()}`, {
        headers: { Authorization: `Bearer ${access.accessToken}` }
      });

      const listMessages = (listResponse.messages ?? []).filter((message): message is { id: string; threadId?: string } => Boolean(message.id));

      for (const message of listMessages) {
        if (messageMap.has(message.id) || suppressedMessageIds.has(message.id)) {
          continue;
        }

        const detailParams = new URLSearchParams();
        detailParams.set("format", "metadata");
        detailParams.append("metadataHeaders", "Subject");
        detailParams.append("metadataHeaders", "From");
        detailParams.append("metadataHeaders", "Date");
        const detail = await fetchJson<GmailMessageResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?${detailParams.toString()}`, {
          headers: { Authorization: `Bearer ${access.accessToken}` }
        });

        messageMap.set(message.id, {
          ...detail,
          threadId: detail.threadId ?? message.threadId ?? "",
          query
        });
      }
    };

    for (const query of queries) {
      await fetchMessagesForQuery(query);
    }

    const relatedDomainQueries = buildRelatedSenderDomainSearchQueries(
      input.companyName,
      Array.from(messageMap.values()).map((message) => senderDomainFromHeader(headerValue(message.payload?.headers, "From"))),
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
          searchQuery: message.query
        })
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
          senderDomain: senderDomainFromHeader(candidate.from)
        }))
      });
    } catch (error) {
      logInfo("gmail", "candidate classification fallback", { company: input.companyName, error: error instanceof Error ? error.message : "unknown" });
    }

    const classificationMap = new Map(classifications.map((item) => [item.messageId, item]));
    const rankedCandidates = sortGmailSearchCandidatesByDate(candidates.map((candidate) => ({
      ...candidate,
      relevance: classificationMap.get(candidate.id) ?? candidate.relevance
    })));

    timer.end({ candidates: rankedCandidates.length, queries: executedQueries.length });
    return {
      companyName: input.companyName,
      roleTitle: input.roleTitle ?? null,
      query: executedQueries.join(" | "),
      candidates: rankedCandidates
    };
  } catch (error) {
    timer.fail(error, { company: input.companyName });
    throw error;
  }
}

export async function parseGmailEmailToInteraction(input: { auth0Email: string; companyName: string; roleTitle?: string | null; messageId: string; jobOpportunityId?: string | null }) {
  const settings = requireSettings();
  const access = await getAccessTokenForEmail(input.auth0Email, settings);

  if (!access) {
    throw new Error("Gmail is not connected.");
  }

  const timer = createTimer("gmail", "parse email", { company: input.companyName, messageId: input.messageId });
  try {
    const detail = await fetchJson<GmailMessageResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${input.messageId}?${new URLSearchParams({
      format: "full"
    }).toString()}`, {
      headers: { Authorization: `Bearer ${access.accessToken}` }
    });
    const email = await parseStructuredGmailEmail({
      message: detail,
      attachmentFetcher: async (messageId, attachmentId) => {
        const attachment = await fetchGmailAttachment(messageId, attachmentId, access.accessToken);
        if (!attachment.data) {
          return "";
        }
        return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
      }
    });

    const derived = deriveInteractionFromStructuredEmail(email);
    logInfo("gmail", "email parsed structured data ready", { company: input.companyName, subject: email.subject, dateSource: derived.dateSource });

    const aiInteraction = await getAiParserService().parseStructuredGmailEmailToInteraction({
      companyName: input.companyName,
      roleTitle: input.roleTitle ?? null,
      email,
      derived
    });

    const parsedInteraction = gmailInteractionDraftSchema.parse({
      ...aiInteraction,
      date: aiInteraction.date?.trim() ? aiInteraction.date : derived.date,
      meetingLink: aiInteraction.meetingLink ?? derived.meetingLink,
      gmailMessageId: input.messageId,
      notes: [derived.notes, aiInteraction.notes].filter(Boolean).join("\n\n") || null
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
        email.calendar?.start ? `Calendar start: ${email.calendar.start}` : null
      ].filter(Boolean) as string[]
    });

    await markGmailMessageState({ auth0Email: input.auth0Email, messageId: input.messageId, jobOpportunityId: input.jobOpportunityId ?? null, status: "USED" });

    timer.end({ company: input.companyName });
    return {
      email,
      interaction: promoteOverdueInteractionStatusForRead(parsedInteraction),
      analysis
    };
  } catch (error) {
    timer.fail(error, { company: input.companyName });
    throw error;
  }
}

export async function handleGmailCallback(input: { code?: string; state?: string; error?: string }) {
  const state = input.state ?? "";

  if (input.error) {
    const settings = getSettings();
    const redirectTo = settings ? new URL("/", settings.frontendOrigin).toString() : "http://localhost:5173/";
    const url = new URL(redirectTo);
    url.searchParams.set("gmailError", input.error);
    return { redirectTo: url.toString() };
  }

  if (!input.code || !state) {
    throw new Error("Missing Gmail OAuth code or state.");
  }

  return completeGmailOAuth(input.code, state);
}

export function getGmailConnectionConfigured() {
  return Boolean(getSettings());
}
