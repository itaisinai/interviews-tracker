import type { z } from "zod";

import {
  gmailEmailClassificationSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
  gmailSearchCandidateSchema,
} from "../../lib/schemas.js";

export type { GmailStatus } from "./gmail-auth.js";
export type {
  GmailDerivedInteraction,
  GmailMeetingDateSource,
  GmailSearchCandidateClassification,
  GmailSearchCandidateMetadata,
  GmailSearchQuery,
  GmailStructuredEmail,
} from "./gmail-message-parser.js";
export type { GmailTrackedMessage } from "./gmail-message-state.js";
export type {
  GmailAttachmentResponse,
  GmailListResponse,
  GmailMessageCandidate,
  GmailMessageHeader,
  GmailMessagePayload,
  GmailMessageResponse,
  GmailProfileResponse,
} from "./gmail-message-utils.js";
export type GmailSearchCandidate = z.infer<typeof gmailSearchCandidateSchema>;
export type GmailEmailClassification = z.infer<typeof gmailEmailClassificationSchema>;
export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;
export type GmailParsedInteraction = z.infer<typeof gmailInteractionDraftSchema>;

export {
  completeGmailOAuth,
  createGmailAuthUrl,
  disconnectGmail,
  fetchGmailAttachment,
  fetchGmailProfile,
  getAccessTokenForEmail,
  getGmailConnectionConfigured,
  getGmailStatus,
  getRefreshTokenForOAuthCallback,
  GMAIL_RECONNECT_REQUIRED_CODE,
  GMAIL_RECONNECT_REQUIRED_MESSAGE,
  GMAIL_SCOPE,
  GmailReconnectRequiredError,
  handleGmailCallback,
  resolveRefreshTokenForOAuthCallback,
  STATE_TTL_MS,
} from "./gmail-auth.js";
export {
  buildOpportunityScopedGmailMessageStateWhere,
  hideGmailMessage,
  ignoreGmailMessage,
  listAllIgnoredGmailMessages,
  listTrackedGmailMessages,
  restoreHiddenGmailMessage,
  unignoreGmailMessage,
  unmarkUsedGmailMessageState,
} from "./gmail-message-state.js";
export {
  findGmailOpportunityCandidates,
  parseGmailEmailToInteraction,
  parseGmailEmailToOpportunity,
  searchGmailMessages,
  syncAttachedGmailInteractionData,
} from "./gmail-search.js";
