import { fetchJson } from "../gmail/gmail-http.js";
import type { GmailDerivedInteraction } from "../gmail/gmail-message-parser.js";
import { deriveInteractionFromStructuredEmail, parseStructuredGmailEmail } from "../gmail/gmail-message-parser.js";
import type { GmailAttachmentResponse, GmailMessageResponse } from "../gmail/gmail-message-utils.js";

type GmailAccess = {
  accessToken: string;
};

type ParsedEmailResult = {
  structured: Awaited<ReturnType<typeof parseStructuredGmailEmail>>;
  derived: GmailDerivedInteraction;
};

/**
 * Fetch and parse a Gmail message
 */
export async function fetchAndParseGmailMessage(
  gmailMessageId: string,
  access: GmailAccess
): Promise<ParsedEmailResult> {
  const rawMessage = await fetchJson<GmailMessageResponse>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMessageId}?${new URLSearchParams({ format: "full" })}`,
    { headers: { Authorization: `Bearer ${access.accessToken}` } }
  );

  const structuredEmail = await parseStructuredGmailEmail({
    message: rawMessage,
    attachmentFetcher: async (messageId, attachmentId) => {
      const attachment = await fetchJson<GmailAttachmentResponse>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
        { headers: { Authorization: `Bearer ${access.accessToken}` } }
      );
      if (!attachment.data) {
        return "";
      }
      return Buffer.from(attachment.data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    },
  });

  const derived = deriveInteractionFromStructuredEmail(structuredEmail);

  return { structured: structuredEmail, derived };
}

/**
 * Create extractedData object for storing in database
 */
export function createExtractedData(parsed: ParsedEmailResult) {
  return {
    derived: parsed.derived,
    structured: {
      subject: parsed.structured.subject,
      from: parsed.structured.fromRaw,
      plainText: parsed.structured.plainText,
      calendar: parsed.structured.calendar,
    },
  };
}
