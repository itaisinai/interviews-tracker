import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildGmailSearchQueries, deriveInteractionFromStructuredEmail, parseStructuredGmailEmail } from "./gmail-message-parser.js";
import type { GmailRawMessageResponse, GmailStructuredEmail } from "./gmail-message-parser.js";

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
  assert.ok(["SCHEDULED", "DONE"].includes(derived.status));
  assert.match(derived.notes ?? "", /Interview with Unframe/);
  assert.match(derived.notes ?? "", /Noam Shchori/);
});

test("builds greedy Gmail queries for .ai company names", () => {
  const queries = buildGmailSearchQueries("Unframe.ai", "Software Engineer");

  assert.ok(queries.some((query) => query.includes("Unframe.ai newer_than:365d")));
  assert.ok(queries.some((query) => query.includes("Unframe newer_than:365d")));
  assert.ok(queries.some((query) => query.includes("\"Unframe.ai\" \"Software Engineer\" newer_than:365d")));
  assert.ok(queries.some((query) => query.includes("\"Unframe\" \"Software Engineer\" newer_than:365d")));
});

test("marks explicit rejection emails as rejected", () => {
  const email: GmailStructuredEmail = {
    id: "msg-1",
    threadId: "thread-1",
    subject: "Thank you for your time",
    fromRaw: "Recruiting Team <jobs@example.com>",
    senderName: "Recruiting Team",
    senderEmail: "jobs@example.com",
    to: ["candidate@example.com"],
    cc: [],
    dateHeader: "Mon, 8 Jun 2026 10:00:00 +0300",
    internalDate: "2026-06-08T07:00:00.000Z",
    snippet: "We decided not to move forward.",
    plainText: "Thank you for your time. Unfortunately, we will not be moving forward at this time.",
    htmlText: "",
    calendarText: "",
    calendar: null
  };

  const derived = deriveInteractionFromStructuredEmail(email);

  assert.equal(derived.status, "REJECTED");
  assert.equal(derived.type, "Rejection");
});
