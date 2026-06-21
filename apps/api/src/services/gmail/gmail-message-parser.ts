import type {
  GmailDerivedInteraction,
  GmailMeetingDateSource,
  GmailRawMessageHeader,
  GmailRawMessagePayload,
  GmailRawMessageResponse,
  GmailSearchCandidateClassification,
  GmailSearchCandidateMetadata,
  GmailSearchQuery,
  GmailStructuredEmail,
  GmailStructuredEmailCalendar
} from "@interviews-tracker/integrations";

export type {
  GmailRawMessageHeader,
  GmailRawMessagePayload,
  GmailRawMessageResponse,
  GmailStructuredEmailCalendar,
  GmailStructuredEmail,
  GmailMeetingDateSource,
  GmailDerivedInteraction,
  GmailSearchQuery,
  GmailSearchCandidateMetadata,
  GmailSearchCandidateClassification
} from "@interviews-tracker/integrations";

function decodeBase64Url(value: string) {
  return Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}

function headerValue(headers: GmailRawMessageHeader[] | undefined, name: string) {
  return headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function splitMailboxList(value: string) {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseMailbox(value: string) {
  const match = value.match(/^(.*?)(?:\s*<([^>]+)>)?$/);
  const name = match?.[1]?.trim().replace(/^"|"$/g, "") ?? "";
  const email = match?.[2]?.trim() ?? "";

  return {
    raw: value.trim(),
    name: name || null,
    email: email || (value.includes("@") ? value.replace(/^.*<|>.*$/g, "").trim() : null)
  };
}

function parseMailboxList(value: string) {
  return splitMailboxList(value).map((item) => parseMailbox(item));
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

function parseClockTime(value: string) {
  const trimmed = value.trim();
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (twelveHourMatch) {
    let hour = Number(twelveHourMatch[1]);
    const minute = Number(twelveHourMatch[2]);
    const meridiem = twelveHourMatch[3].toUpperCase();

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

  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);

  if (twentyFourHourMatch) {
    const hour = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);

    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    return { hour, minute };
  }

  return null;
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

function convertZonedLocalToIso(parts: { year: number; month: number; day: number; hour: number; minute: number }, timeZone: string) {
  const utcGuess = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const zonedParts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(new Date(utcGuess));

  const getPart = (type: string) => Number(zonedParts.find((part) => part.type === type)?.value ?? "0");
  const zonedAsUtc = Date.UTC(getPart("year"), getPart("month") - 1, getPart("day"), getPart("hour"), getPart("minute"), getPart("second"));
  const offsetMs = zonedAsUtc - utcGuess;
  return new Date(utcGuess - offsetMs).toISOString();
}

function parseDateTimeValue(value: string, timezone: string | null) {
  const utcMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i);

  if (utcMatch) {
    return new Date(Date.UTC(
      Number(utcMatch[1]),
      Number(utcMatch[2]) - 1,
      Number(utcMatch[3]),
      Number(utcMatch[4]),
      Number(utcMatch[5]),
      Number(utcMatch[6])
    )).toISOString();
  }

  const localMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/i) ?? value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})$/i);

  if (!localMatch) {
    return null;
  }

  const year = Number(localMatch[1]);
  const month = Number(localMatch[2]);
  const day = Number(localMatch[3]);
  const hour = Number(localMatch[4]);
  const minute = Number(localMatch[5]);

  if (timezone) {
    try {
      return convertZonedLocalToIso({ year, month, day, hour, minute }, timezone);
    } catch {
      return localTimeToIso({ year, month, day, hour, minute }, 0);
    }
  }

  return localTimeToIso({ year, month, day, hour, minute }, 0);
}

function parseIcsPropertyLine(line: string) {
  const separatorIndex = line.indexOf(":");

  if (separatorIndex === -1) {
    return null;
  }

  const rawName = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [name, ...params] = rawName.split(";");
  const paramMap = new Map<string, string>();

  for (const param of params) {
    const [key, ...rest] = param.split("=");
    if (key && rest.length > 0) {
      paramMap.set(key.toUpperCase(), rest.join("="));
    }
  }

  return {
    name: name.toUpperCase(),
    value,
    params: paramMap
  };
}

function unfoldIcsLines(value: string) {
  return value.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

export function parseIcsCalendar(value: string): GmailStructuredEmailCalendar | null {
  const unfolded = unfoldIcsLines(value);
  const lines = unfolded.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const eventLines: string[] = [];
  let insideEvent = false;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      insideEvent = true;
      continue;
    }

    if (line === "END:VEVENT") {
      break;
    }

    if (insideEvent) {
      eventLines.push(line);
    }
  }

  if (!eventLines.length) {
    return null;
  }

  const calendar: GmailStructuredEmailCalendar = {
    summary: null,
    description: null,
    location: null,
    start: null,
    end: null,
    timezone: null,
    attendees: []
  };

  for (const line of eventLines) {
    const property = parseIcsPropertyLine(line);

    if (!property) {
      continue;
    }

    if (property.name === "SUMMARY") {
      calendar.summary = property.value.trim() || null;
      continue;
    }

    if (property.name === "DESCRIPTION") {
      calendar.description = property.value.trim() || null;
      continue;
    }

    if (property.name === "LOCATION") {
      calendar.location = property.value.trim() || null;
      continue;
    }

    if (property.name === "ATTENDEE") {
      const attendee = property.value.replace(/^mailto:/i, "").trim();
      if (attendee) {
        calendar.attendees.push(attendee);
      }
      continue;
    }

    if (property.name === "DTSTART" || property.name === "DTEND") {
      const timezone = property.params.get("TZID") ?? calendar.timezone;
      if (timezone) {
        calendar.timezone = timezone;
      }
      const parsed = parseDateTimeValue(property.value.trim(), timezone ?? null);
      if (property.name === "DTSTART") {
        calendar.start = parsed;
      } else {
        calendar.end = parsed;
      }
    }
  }

  return calendar;
}

function collectTextFromPayload(payload: GmailRawMessagePayload | undefined) {
  const result = {
    plainText: "",
    htmlText: "",
    calendarText: "",
    calendar: null as GmailStructuredEmailCalendar | null
  };

  if (!payload) {
    return result;
  }

  const parts = payload.parts ?? [];

  for (const part of parts) {
    const child = collectTextFromPayload(part);
    if (!result.plainText && child.plainText) {
      result.plainText = child.plainText;
    }
    if (!result.htmlText && child.htmlText) {
      result.htmlText = child.htmlText;
    }
    if (!result.calendarText && child.calendarText) {
      result.calendarText = child.calendarText;
    }
    if (!result.calendar && child.calendar) {
      result.calendar = child.calendar;
    }
  }

  const data = payload.body?.data;

  if (data) {
    const decoded = decodeBase64Url(data).trim();

    if (payload.mimeType === "text/plain" && decoded) {
      result.plainText = result.plainText || decoded;
    }

    if (payload.mimeType === "text/html" && decoded) {
      result.htmlText = result.htmlText || decoded;
    }

    if (payload.mimeType === "text/calendar" || payload.mimeType === "application/ics") {
      result.calendarText = result.calendarText || decoded;
      result.calendar = result.calendar || parseIcsCalendar(decoded);
    }
  }

  return result;
}

function collectAllParts(payload: GmailRawMessagePayload | undefined, parts: GmailRawMessagePayload[] = []) {
  if (!payload?.parts?.length) {
    return parts;
  }

  for (const part of payload.parts) {
    parts.push(part);
    collectAllParts(part, parts);
  }

  return parts;
}

function parseMeetingTimeFromText(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b,?\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})(?:[^\d]+)?(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)(?:\s*-\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?(?:\s*\(([^)]+)\))?/i,
    /(?:on\s+)?([A-Za-z]{3,9})\s+(\d{1,2}),\s+(\d{4})(?:[^\d]+)?(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)(?:\s*-\s*\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)?(?:\s*\(([^)]+)\))?/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);

    if (!match) {
      continue;
    }

    const timePart = match[4];
    const timezonePart = match[5] ?? "";
    const clock = parseClockTime(timePart);

    if (!clock) {
      continue;
    }

    let year: number;
    let month: number;
    let day: number;

    if (/^\d{1,2}$/.test(match[1] ?? "")) {
      day = Number(match[1]);
      month = monthIndexFromName(match[2] ?? "") + 1;
      year = Number(match[3]);
    } else {
      month = monthIndexFromName(match[1] ?? "") + 1;
      day = Number(match[2]);
      year = Number(match[3]);
    }

    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      continue;
    }

    const offsetHours = parseTimezoneOffset(timezonePart);

    if (offsetHours === null) {
      continue;
    }

    return localTimeToIso({ year, month, day, hour: clock.hour, minute: clock.minute }, offsetHours);
  }

  return null;
}

function inferStageFromEmailText(text: string) {
  if (/final interview|final round/i.test(text)) return "Final Interview";
  if (/technical interview|technical round/i.test(text)) return "Technical Interview";
  if (/hr screen|human resources screen/i.test(text)) return "HR Screen";
  if (/recruiter screen|recruiter call|screening call|phone screen/i.test(text)) return "Recruiter Screen";
  if (/onsite/i.test(text)) return "Onsite";
  if (/interview/i.test(text)) return "Interview";
  return null;
}

function inferTypeFromEmail(email: GmailStructuredEmail) {
  const text = `${email.subject}\n${email.plainText}\n${email.calendar?.summary ?? ""}`;

  if (/assignment|take-home|take home/i.test(text)) {
    return "Home Assignment";
  }

  if (/phone call|phone interview|phone screen|screening call/i.test(text)) {
    return "Phone Call";
  }

  if (/technical interview|technical round/i.test(text)) {
    return "Technical Interview";
  }

  if (/hr screen|human resources screen/i.test(text)) {
    return "HR Screen";
  }

  if (/recruiter screen|recruiter call/i.test(text)) {
    return "Recruiter Screen";
  }

  if (/onsite/i.test(text)) {
    return "Onsite";
  }

  if (/offer/i.test(text)) {
    return "Offer";
  }

  if (/reject|not.*moving forward|moving on|not a fit|declin/i.test(text)) {
    return "Rejection";
  }

  if (/follow[- ]up/i.test(text)) {
    return "Follow-up";
  }

  if (/interview|screening/i.test(text) || email.calendar) {
    return "Interview";
  }

  return "Email";
}

function inferStatusFromEmail(email: GmailStructuredEmail, meetingDate: string | null) {
  const text = `${email.subject}\n${email.plainText}\n${email.calendar?.summary ?? ""}`.toLowerCase();

  if (/reject|not.*moving forward|moving on|not a fit|no longer/i.test(text)) {
    return "REJECTED";
  }

  if (/cancel|canceled|cancelled|resched|re-sched|postpone/i.test(text)) {
    return /cancel/i.test(text) ? "CANCELLED" : "NEEDS_FOLLOW_UP";
  }

  if (meetingDate) {
    return new Date(meetingDate).getTime() > Date.now() ? "SCHEDULED" : "DONE";
  }

  if (/follow[- ]up/i.test(text)) {
    return "NEEDS_FOLLOW_UP";
  }

  return "NEEDS_FOLLOW_UP";
}

export async function parseStructuredGmailEmail(input: {
  message: GmailRawMessageResponse;
  attachmentFetcher?: (messageId: string, attachmentId: string) => Promise<string>;
}): Promise<GmailStructuredEmail> {
  const headers = input.message.payload?.headers ?? [];
  const structured = collectTextFromPayload(input.message.payload);
  const messageId = input.message.id ?? "";
  const threadId = input.message.threadId ?? "";
  let calendar = structured.calendar;
  let plainText = structured.plainText;
  let htmlText = structured.htmlText;
  let calendarText = structured.calendarText;

  // If no plainText but we have HTML, strip HTML to get text
  if (!plainText && htmlText) {
    plainText = stripHtml(htmlText);
    console.log('[PARSE] No plain text found, stripped HTML. Length:', plainText.length);
  }

  const messageParts = collectAllParts(input.message.payload);

  for (const part of messageParts) {
    const attachmentId = part.body?.attachmentId;
    const mimeType = part.mimeType ?? "";
    const filename = part.filename ?? "";

    if (!attachmentId || !input.attachmentFetcher) {
      continue;
    }

    if (mimeType === "text/calendar" || mimeType === "application/ics" || /\.ics$/i.test(filename)) {
      const attachmentText = await input.attachmentFetcher(messageId, attachmentId);
      if (attachmentText) {
        calendarText = calendarText || attachmentText;
        calendar = calendar || parseIcsCalendar(attachmentText);
      }
    }
  }

  const subject = headerValue(headers, "Subject") || "(No subject)";
  const fromRaw = headerValue(headers, "From") || "Unknown sender";
  const parsedFrom = parseMailbox(fromRaw);
  const to = parseMailboxList(headerValue(headers, "To"));
  const cc = parseMailboxList(headerValue(headers, "Cc"));
  const dateHeader = headerValue(headers, "Date") || null;

  return {
    id: messageId,
    threadId,
    subject,
    fromRaw,
    senderName: parsedFrom.name,
    senderEmail: parsedFrom.email,
    to: to.map((item) => item.raw),
    cc: cc.map((item) => item.raw),
    dateHeader,
    internalDate: parseGmailInternalDate(input.message.internalDate),
    snippet: input.message.snippet?.trim() || "(No snippet available)",
    plainText,
    htmlText,
    calendarText,
    calendar
  };
}


function parseGmailInternalDate(value: string | undefined) {
  const timestamp = Number(value);

  if (Number.isFinite(timestamp) && timestamp > 0) {
    return new Date(timestamp).toISOString();
  }

  if (value) {
    const parsed = new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function buildCompanySearchVariants(companyName: string, aliases: Array<string | null | undefined> = []) {
  const variants = new Set<string>();
  const names = [companyName, ...aliases].map((name) => name?.trim()).filter((name): name is string => Boolean(name));

  if (names.length === 0) {
    return [];
  }

  for (const normalized of names) {
    variants.add(normalized);

    if (/\.ai\b/i.test(normalized)) {
      const withoutAiSuffix = normalized.replace(/\.ai\b/gi, "").replace(/\s+/g, " ").trim();
      if (withoutAiSuffix) {
        variants.add(withoutAiSuffix);
      }
    }
  }

  return [...variants];
}

function buildCompanySearchTokens(companyName: string, aliases: Array<string | null | undefined> = []) {
  return buildCompanySearchVariants(companyName, aliases)
    .flatMap((variant) => variant.toLowerCase().split(/[^a-z0-9]+/i))
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !["inc", "ltd", "llc", "com", "co", "io", "ai"].includes(token));
}

export function buildGmailSearchQueries(
  companyName: string,
  roleTitle?: string | null,
  aliases: Array<string | null | undefined> = [],
  senderDomains: Array<string | null | undefined> = [],
) {
  const companyVariants = buildCompanySearchVariants(companyName, aliases);
  const queries = new Set<string>();

  for (const variant of companyVariants) {
    queries.add(`${variant} newer_than:365d`);
    queries.add(`"${variant}" interview newer_than:365d`);
    queries.add(`"${variant}" (interview OR recruiter OR assignment OR offer OR rejection) newer_than:365d`);

    if (roleTitle?.trim()) {
      queries.add(`"${variant}" "${roleTitle.trim()}" newer_than:365d`);
    }
  }

  for (const query of buildRelatedSenderDomainSearchQueries(companyName, senderDomains, aliases)) {
    queries.add(query);
  }

  return [...queries];
}

export function buildRelatedSenderDomainSearchQueries(companyName: string, senderDomains: Array<string | null | undefined>, aliases: Array<string | null | undefined> = []) {
  const companyTokens = buildCompanySearchTokens(companyName, aliases);
  const queries = new Set<string>();

  if (companyTokens.length === 0) {
    return [];
  }

  for (const senderDomain of senderDomains) {
    const domain = senderDomain?.toLowerCase().replace(/[>,;]+$/g, "").trim();

    if (!domain || !companyTokens.some((token) => domain.includes(token))) {
      continue;
    }

    const domainRoot = domain.split(".")[0]?.trim();

    if (domainRoot && domainRoot.length >= 3) {
      queries.add(`${domainRoot} newer_than:365d`);
    }

    queries.add(`"${domain}" newer_than:365d`);
    queries.add(`from:${domain} newer_than:365d`);
  }

  return [...queries];
}

export function sortGmailSearchCandidatesByDate<T extends { date: string }>(candidates: T[]) {
  return candidates.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function cleanMeetingUrl(value: string) {
  return value
    .replace(/\\n/g, "")
    .replace(/\\\//g, "/")
    .replace(/[),.;\]]+$/g, "")
    .trim();
}

export function extractMeetingUrlFromStructuredEmail(email: GmailStructuredEmail) {
  const sources = [
    email.calendar?.location,
    email.calendar?.description,
    email.plainText,
    email.htmlText,
    email.calendarText
  ].filter(Boolean).join("\n");
  const urlMatches = sources.match(/https?:\/\/[^\s<>"']+/gi) ?? [];
  const meetingUrl = urlMatches
    .map(cleanMeetingUrl)
    .find((url) => /(?:^https?:\/\/)?(?:[\w-]+\.)?(?:zoom\.us|meet\.google\.com)\b/i.test(url));

  return meetingUrl ?? null;
}

export function extractStructuredEmailMeetingDate(email: GmailStructuredEmail) {
  if (email.calendar?.start) {
    return { date: email.calendar.start, dateSource: "calendar" as const };
  }

  const textSource = parseMeetingTimeFromText([
    email.subject,
    email.plainText,
    email.calendarText
  ].filter(Boolean).join("\n"));

  if (textSource) {
    return { date: textSource, dateSource: "text" as const };
  }

  if (email.dateHeader) {
    const parsed = new Date(email.dateHeader);

    if (!Number.isNaN(parsed.getTime())) {
      return { date: parsed.toISOString(), dateSource: "header" as const };
    }
  }

  return { date: email.internalDate, dateSource: "header" as const };
}

export function deriveInteractionFromStructuredEmail(email: GmailStructuredEmail): GmailDerivedInteraction {
  const meeting = extractStructuredEmailMeetingDate(email);
  const text = [email.subject, email.plainText, email.calendar?.summary ?? "", email.calendar?.description ?? ""].filter(Boolean).join("\n");
  const type = inferTypeFromEmail(email);
  const stage = inferStageFromEmailText(text);
  const status = inferStatusFromEmail(email, meeting.date);
  const agenda = email.calendar?.summary || null;
  const meetingUrl = extractMeetingUrlFromStructuredEmail(email);

  // Extract participant names from calendar attendees
  let participantNames: string | null = null;
  if (email.calendar?.attendees && email.calendar.attendees.length > 0) {
    // Parse email addresses to extract names
    const attendeeNames = email.calendar.attendees
      .map(attendee => {
        // Try to extract name from "Name <email>" or just use email
        const mailbox = parseMailbox(attendee);
        return mailbox.name || mailbox.email?.split('@')[0];
      })
      .filter(Boolean);

    if (attendeeNames.length > 0) {
      participantNames = attendeeNames.join(', ');
    }
  }

  // Fallback to sender name if no attendees
  const personName = participantNames || email.senderName;

  const notesParts = [
    `Subject: ${email.subject}`,
    `From: ${email.fromRaw}`,
    email.calendar?.location ? `Location: ${email.calendar.location}` : null,
    meetingUrl ? `Meeting link: ${meetingUrl}` : null,
    email.calendar?.start ? `Calendar start: ${email.calendar.start}` : null,
    email.calendar?.end ? `Calendar end: ${email.calendar.end}` : null,
    email.dateHeader ? `Date header: ${email.dateHeader}` : null,
    email.plainText.trim() ? `Body: ${email.plainText.trim().slice(0, 1200)}` : null
  ].filter(Boolean) as string[];

  return {
    date: meeting.date,
    endDate: email.calendar?.end ?? null,
    dateSource: meeting.dateSource,
    type,
    stage,
    status,
    personName,
    personRole: null,
    agenda,
    meetingLink: meetingUrl,
    notes: notesParts.join("\n"),
    outcome: null,
    followUp: /follow[- ]up|reply|confirm|let me know/i.test(text) ? "Follow up with the sender." : null
  };
}

export function guessSenderDomain(email: GmailStructuredEmail) {
  const source = email.senderEmail ?? email.fromRaw;
  const match = source.match(/@([^>\s]+)/);
  return match?.[1]?.toLowerCase() ?? null;
}

export function classifySearchCandidateFallback(input: {
  messageId: string;
  companyName: string;
  companyAliases?: Array<string | null | undefined>;
  roleTitle?: string | null;
  subject: string;
  from: string;
  snippet: string;
  date: string;
  senderDomain?: string | null;
  searchQuery?: string | null;
}): GmailSearchCandidateClassification {
  const text = `${input.subject}\n${input.from}\n${input.snippet}`.toLowerCase();
  const companyNames = [input.companyName, ...(input.companyAliases ?? [])]
    .map((name) => name?.trim().toLowerCase())
    .filter((name): name is string => Boolean(name));
  const company = companyNames[0] ?? input.companyName.toLowerCase();
  const role = input.roleTitle?.toLowerCase() ?? "";
  const senderDomain = input.senderDomain?.toLowerCase() ?? "";
  const searchQuery = input.searchQuery?.toLowerCase() ?? "";
  const companyTokens = buildCompanySearchTokens(input.companyName, input.companyAliases);
  const domainRelated = companyTokens.some((token) => senderDomain.includes(token));
  const queryRelated = companyTokens.some((token) => searchQuery.includes(token));
  const related = companyNames.some((name) => text.includes(name)) || (role ? text.includes(role) : false) || domainRelated || queryRelated;
  const interview = /interview|screening|onsite|phone screen|recruiter|assignment|offer|rejection|follow[- ]up|invitation|meeting|calendar/.test(text);
  const relevant = related || interview;
  const confidence = relevant ? (related && interview ? 0.88 : 0.72) : 0.22;

  let emailType: GmailSearchCandidateClassification["emailType"] = "UNRELATED";
  if (/offer/.test(text)) emailType = "OFFER";
  else if (/rejection|sorry|not.*moving forward/.test(text)) emailType = "REJECTION";
  else if (/assignment|take-home|take home/.test(text)) emailType = "FOLLOW_UP";
  else if (/interview|screening|onsite|phone screen|invitation|meeting|calendar/.test(text)) emailType = "INTERVIEW_INVITATION";
  else if (/follow[- ]up|checking in|next steps|reschedule|schedule/.test(text)) emailType = "FOLLOW_UP";
  else if (/recruiter|talent acquisition|hiring manager|human resources|hr/.test(text)) emailType = "RECRUITER_MESSAGE";

  let reason = "No strong company or hiring-process signal found.";

  if (relevant) {
    if (queryRelated && interview) {
      reason = `Matched a related sender-domain search for ${company} and hiring-process language.`;
    } else if (domainRelated && interview) {
      reason = `Sender domain matches ${company} and hiring-process language.`;
    } else if (related && interview) {
      reason = `Mentions ${company} and hiring-process language.`;
    } else if (domainRelated) {
      reason = `Sender domain matches ${company}.`;
    } else if (queryRelated) {
      reason = `Matched a related sender-domain search for ${company}.`;
    } else if (related) {
      reason = `Directly mentions ${company}.`;
    } else {
      reason = "Contains hiring-process language relevant to the opportunity.";
    }
  }

  return {
    messageId: input.messageId,
    isRelevant: relevant,
    confidence,
    emailType,
    reason
  };
}
