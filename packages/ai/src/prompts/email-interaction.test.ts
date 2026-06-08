import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEmailInteractionParserSystemPrompt } from "./email-interaction.js";

test("email interaction prompt prefers explicit phone call types", () => {
  const prompt = buildEmailInteractionParserSystemPrompt();

  assert.match(prompt, /Type must be exactly one of:/);
  assert.match(prompt, /Phone Call/);
  assert.match(prompt, /Follow-up/);
  assert.match(prompt, /type must be Phone Call/);
  assert.match(prompt, /do not collapse it into a generic Interview/i);
});
