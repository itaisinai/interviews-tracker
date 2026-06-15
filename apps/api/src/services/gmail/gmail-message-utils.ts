import type { z } from "zod";

import {
  gmailMessageCandidateSchema
} from "../../lib/schemas.js";

export type GmailMessageHeader = {
  name?: string;
  value?: string;
};

export type GmailMessagePayload = {
  mimeType?: string;
  body?: {
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePayload[];
  headers?: GmailMessageHeader[];
};

export type GmailMessageResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailMessagePayload;
};

export type GmailAttachmentResponse = {
  data?: string;
  size?: number;
};

export type GmailProfileResponse = {
  emailAddress?: string;
};

export type GmailListResponse = {
  messages?: Array<{
    id?: string;
    threadId?: string;
  }>;
};

export type GmailMessageCandidate = z.infer<typeof gmailMessageCandidateSchema>;

export function headerValue(headers: GmailMessageHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

export function senderDomainFromHeader(value: string) {
  const match = value.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

export function stripHtml(value: string) {
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

export function extractPayloadText(payload?: GmailMessagePayload): string {
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

export function parseInternalDate(value?: string) {
  const timestamp = Number(value);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp).toISOString();
  }

  return new Date().toISOString();
}

export function parseTimeComponent(value: string) {
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

export function monthIndexFromName(value: string) {
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

export function parseTimezoneOffset(value: string) {
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

export function localTimeToIso(parts: { year: number; month: number; day: number; hour: number; minute: number }, offsetHours: number) {
  const utcMillis = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour - offsetHours, parts.minute);
  return new Date(utcMillis).toISOString();
}

export function extractDateComponents(text: string) {
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

export function mapMessageCandidate(message: GmailMessageResponse): GmailMessageCandidate {
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
