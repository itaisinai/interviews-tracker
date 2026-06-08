import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parseStructuredGmailEmail, deriveInteractionFromStructuredEmail } from "./gmail-message-parser.js";
import type { GmailRawMessageResponse } from "./gmail-message-parser.js";

const fixturePath = new URL("./__fixtures__/gmail-unframe-interview.json", import.meta.url);
const fixture = JSON.parse(readFileSync(fixturePath, "utf8")) as GmailRawMessageResponse;

test("parses Unframe interview email with calendar-safe date and generic interview stage", async () => {
  const email = await parseStructuredGmailEmail({ message: fixture });
  const derived = deriveInteractionFromStructuredEmail(email);

  assert.equal(email.subject, "Interview with Unframe @ Mon 8 Jun 2026 11:30 - 11:50 (GMT+3)");
  assert.equal(email.senderName, "Noam Shchori");
  assert.equal(email.senderEmail, "noam.shchori@unframe.ai");
  assert.equal(derived.date, "2026-06-08T08:30:00.000Z");
  assert.equal(derived.dateSource, "text");
  assert.equal(derived.type, "Interview");
  assert.equal(derived.stage, "Interview");
  assert.equal(derived.status, "SCHEDULED");
  assert.match(derived.notes ?? "", /Interview with Unframe/);
  assert.match(derived.notes ?? "", /Noam Shchori/);
});
