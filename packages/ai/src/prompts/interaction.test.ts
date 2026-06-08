import assert from "node:assert/strict";
import { test } from "node:test";
import { buildInteractionTextParserSystemPrompt } from "./interaction.js";

test("interaction text prompt includes the explicit type enum list", () => {
  const prompt = buildInteractionTextParserSystemPrompt({
    companyName: "Unframe",
    roleTitle: "Software Engineer",
    opportunityContext: "Status: RECRUITER_REACHED_OUT",
    nowIso: "2026-06-08T10:00:00.000Z"
  });

  assert.match(prompt, /Type must be exactly one of:/);
  assert.match(prompt, /Phone Call/);
  assert.match(prompt, /Follow-up/);
  assert.match(prompt, /If the text explicitly says Phone Call, use type Phone Call/);
});
