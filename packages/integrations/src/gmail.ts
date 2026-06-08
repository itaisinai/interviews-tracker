import { z } from "zod";

export type GmailRawMessageHeader = {
  name?: string;
  value?: string;
};

export type GmailRawMessagePayload = {
  mimeType?: string;
  filename?: string;
  body?: {
    data?: string;
    size?: number;
    attachmentId?: string;
  };
  parts?: GmailRawMessagePayload[];
  headers?: GmailRawMessageHeader[];
};

export type GmailRawMessageResponse = {
  id?: string;
  threadId?: string;
  snippet?: string;
  internalDate?: string;
  payload?: GmailRawMessagePayload;
};

export type GmailStructuredEmailCalendar = {
  summary: string | null;
  description: string | null;
  location: string | null;
  start: string | null;
  end: string | null;
  timezone: string | null;
  attendees: string[];
};

export type GmailStructuredEmail = {
  id: string;
  threadId: string;
  subject: string;
  fromRaw: string;
  senderName: string | null;
  senderEmail: string | null;
  to: string[];
  cc: string[];
  dateHeader: string | null;
  internalDate: string;
  snippet: string;
  plainText: string;
  htmlText: string;
  calendarText: string;
  calendar: GmailStructuredEmailCalendar | null;
};

export type GmailMeetingDateSource = "calendar" | "text" | "header";

export type GmailDerivedInteraction = {
  date: string;
  dateSource: GmailMeetingDateSource;
  type: string;
  stage: string | null;
  status: "SCHEDULED" | "DONE" | "CANCELLED" | "NEEDS_FOLLOW_UP";
  personName: string | null;
  personRole: string | null;
  agenda: string | null;
  notes: string | null;
  outcome: string | null;
  followUp: string | null;
};

export type GmailMessageCandidate = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailEmailClassification = {
  messageId: string;
  isRelevant: boolean;
  confidence: number;
  emailType: "INTERVIEW_INVITATION" | "RECRUITER_MESSAGE" | "FOLLOW_UP" | "REJECTION" | "OFFER" | "UNRELATED";
  reason: string;
};

export type GmailSearchCandidate = GmailMessageCandidate & {
  relevance: GmailEmailClassification;
};

export type GmailSearchResponse = {
  companyName: string;
  roleTitle: string | null;
  query: string;
  candidates: GmailSearchCandidate[];
};

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  updatedAt: string | null;
};

export type GmailConnectRequest = {
  returnTo?: string;
};

export type GmailConnectResponse = {
  authUrl: string;
};

export type GmailSearchQuery = {
  query: string;
};

export type GmailSearchCandidateMetadata = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailSearchCandidateClassification = {
  messageId: string;
  isRelevant: boolean;
  confidence: number;
  emailType: "INTERVIEW_INVITATION" | "RECRUITER_MESSAGE" | "FOLLOW_UP" | "REJECTION" | "OFFER" | "UNRELATED";
  reason: string;
};

export const gmailMessageCandidateSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string().min(1),
  from: z.string().min(1),
  date: z.string().min(1),
  snippet: z.string().min(1)
});

export const gmailEmailCalendarSchema = z.object({
  summary: z.string().nullable(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
  timezone: z.string().nullable(),
  attendees: z.array(z.string())
});

export const gmailStructuredEmailSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string().min(1),
  fromRaw: z.string().min(1),
  senderName: z.string().nullable(),
  senderEmail: z.string().nullable(),
  to: z.array(z.string()),
  cc: z.array(z.string()),
  dateHeader: z.string().nullable(),
  internalDate: z.string().min(1),
  snippet: z.string().min(1),
  plainText: z.string(),
  htmlText: z.string(),
  calendarText: z.string(),
  calendar: gmailEmailCalendarSchema.nullable()
});

export const gmailEmailClassificationSchema = z.object({
  messageId: z.string().min(1),
  isRelevant: z.boolean(),
  confidence: z.number().min(0).max(1),
  emailType: z.enum([
    "INTERVIEW_INVITATION",
    "RECRUITER_MESSAGE",
    "FOLLOW_UP",
    "REJECTION",
    "OFFER",
    "UNRELATED"
  ]),
  reason: z.string().min(1)
});

export const gmailSearchCandidateSchema = gmailMessageCandidateSchema.extend({
  relevance: gmailEmailClassificationSchema
});

export const gmailStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  googleEmail: z.string().nullable(),
  updatedAt: z.string().nullable()
});

export const gmailConnectRequestSchema = z.object({
  returnTo: z.string().optional()
});

export const gmailConnectResponseSchema = z.object({
  authUrl: z.string().url()
});

export const gmailSearchResponseSchema = z.object({
  companyName: z.string(),
  roleTitle: z.string().nullable(),
  query: z.string(),
  candidates: z.array(gmailSearchCandidateSchema)
});

export const gmailParseEmailRequestSchema = z.object({
  messageId: z.string().min(1)
});
