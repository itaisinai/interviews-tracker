import type { z } from "zod";

import {
  gmailEmailClassificationSchema,
  gmailEmailExtractionAnalysisSchema,
  gmailInteractionDraftSchema,
  gmailSearchCandidateSchema
} from "../../lib/schemas.js";

export type { GmailMessageHeader, GmailMessagePayload, GmailMessageResponse, GmailAttachmentResponse, GmailProfileResponse, GmailListResponse, GmailMessageCandidate } from "./gmail-message-utils.js";
export type { GmailTrackedMessage } from "./gmail-message-state.js";
export type {
  GmailStructuredEmail,
  GmailMeetingDateSource,
  GmailDerivedInteraction,
  GmailSearchQuery,
  GmailSearchCandidateMetadata,
  GmailSearchCandidateClassification
} from "./gmail-message-parser.js";

export type { GmailStatus } from "./gmail-auth.js";
export type GmailSearchCandidate = z.infer<typeof gmailSearchCandidateSchema>;
export type GmailEmailClassification = z.infer<typeof gmailEmailClassificationSchema>;
export type GmailEmailExtractionAnalysis = z.infer<typeof gmailEmailExtractionAnalysisSchema>;
export type GmailParsedInteraction = z.infer<typeof gmailInteractionDraftSchema>;

export {
  GMAIL_RECONNECT_REQUIRED_CODE,
  GMAIL_RECONNECT_REQUIRED_MESSAGE,
  GMAIL_SCOPE,
  GmailReconnectRequiredError,
  STATE_TTL_MS,
  completeGmailOAuth,
  createGmailAuthUrl,
  disconnectGmail,
  fetchGmailAttachment,
  fetchGmailProfile,
  getAccessTokenForEmail,
  getGmailConnectionConfigured,
  getGmailStatus,
  getRefreshTokenForOAuthCallback,
  handleGmailCallback,
  resolveRefreshTokenForOAuthCallback
} from "./gmail-auth.js";

export {
  buildOpportunityScopedGmailMessageStateWhere,
  hideGmailMessage,
  listTrackedGmailMessages,
  restoreHiddenGmailMessage,
  unmarkUsedGmailMessageState
} from "./gmail-message-state.js";

export {
  parseGmailEmailToInteraction,
  searchGmailMessages,
  syncAttachedGmailInteractionData
} from "./gmail-search.js";
