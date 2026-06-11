import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { buildGmailSearchQueries, buildRelatedSenderDomainSearchQueries, classifySearchCandidateFallback, deriveInteractionFromStructuredEmail, parseStructuredGmailEmail, sortGmailSearchCandidatesByDate } from "./gmail-message-parser.js";
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

test("builds extra searches for sender domains that include the company token", () => {
  const queries = buildRelatedSenderDomainSearchQueries("Alta", ["altahq.com", "dialog.co.il", "gmail.com", null]);

  assert.ok(queries.includes("altahq newer_than:365d"));
  assert.ok(queries.includes("\"altahq.com\" newer_than:365d"));
  assert.ok(queries.includes("from:altahq.com newer_than:365d"));
  assert.equal(queries.some((query) => query.includes("dialog")), false);
});

test("fallback classification treats matching sender domains as company-related", () => {
  const classification = classifySearchCandidateFallback({
    messageId: "msg-1",
    companyName: "Alta",
    roleTitle: "Full Stack",
    subject: "Invitation from an unknown sender: Itai and Rotem Zikorel",
    from: "Google Calendar <calendar-notification@google.com>",
    snippet: "Tue 16 Jun 12:00 - 12:30 meeting invitation",
    date: "2026-06-16T09:00:00.000Z",
    senderDomain: "google.com",
    searchQuery: "\"altahq.com\" newer_than:365d"
  });

  assert.equal(classification.isRelevant, true);
  assert.equal(classification.emailType, "INTERVIEW_INVITATION");
  assert.match(classification.reason, /related sender-domain search for alta/i);
});

test("sorts Gmail search candidates newest first", () => {
  const sorted = sortGmailSearchCandidatesByDate([
    { id: "older", date: "2026-06-10T09:00:00.000Z" },
    { id: "newest", date: "2026-06-16T09:00:00.000Z" },
    { id: "middle", date: "2026-06-12T09:00:00.000Z" }
  ]);

  assert.deepEqual(sorted.map((candidate) => candidate.id), ["newest", "middle", "older"]);
});

test("adds Google Meet link from calendar location to derived notes", () => {
  const email: GmailStructuredEmail = {
    id: "msg-1",
    threadId: "thread-1",
    subject: "Interview with Alta",
    fromRaw: "Rotem <rotem@altahq.com>",
    senderName: "Rotem",
    senderEmail: "rotem@altahq.com",
    to: ["candidate@example.com"],
    cc: [],
    dateHeader: "Mon, 8 Jun 2026 10:00:00 +0300",
    internalDate: "2026-06-08T07:00:00.000Z",
    snippet: "Meet link attached.",
    plainText: "Looking forward to speaking.",
    htmlText: "",
    calendarText: "",
    calendar: {
      summary: "Alta interview",
      description: null,
      location: "https://meet.google.com/abc-defg-hij",
      start: "2026-06-16T09:00:00.000Z",
      end: "2026-06-16T09:30:00.000Z",
      timezone: null,
      attendees: []
    }
  };

  const derived = deriveInteractionFromStructuredEmail(email);

  assert.match(derived.notes ?? "", /Meeting link: https:\/\/meet\.google\.com\/abc-defg-hij/);
});

test("adds Zoom link from email body to derived notes", () => {
  const email: GmailStructuredEmail = {
    id: "msg-1",
    threadId: "thread-1",
    subject: "Phone screen",
    fromRaw: "Recruiter <recruiter@example.com>",
    senderName: "Recruiter",
    senderEmail: "recruiter@example.com",
    to: ["candidate@example.com"],
    cc: [],
    dateHeader: "Mon, 8 Jun 2026 10:00:00 +0300",
    internalDate: "2026-06-08T07:00:00.000Z",
    snippet: "Join with Zoom.",
    plainText: "Join Zoom Meeting: https://us02web.zoom.us/j/123456789?pwd=secret.",
    htmlText: "",
    calendarText: "",
    calendar: null
  };

  const derived = deriveInteractionFromStructuredEmail(email);

  assert.match(derived.notes ?? "", /Meeting link: https:\/\/us02web\.zoom\.us\/j\/123456789\?pwd=secret/);
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
