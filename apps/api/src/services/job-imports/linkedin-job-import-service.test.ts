import test from "node:test";
import assert from "node:assert/strict";
import { extractLinkedinJobIdFromUrl, linkedinJobImportInputSchema } from "./linkedin-job-import-service.js";

test("linkedin import validation extracts currentJobId when missing", () => {
  const parsed = linkedinJobImportInputSchema.parse({ sourceUrl: "https://www.linkedin.com/jobs/search/?currentJobId=123", rawText: "Useful job content" });
  assert.equal(parsed.linkedinJobId, "123");
});

test("linkedin import validation rejects requests without useful content", () => {
  assert.throws(() => linkedinJobImportInputSchema.parse({ sourceUrl: "https://www.linkedin.com/jobs/view/123/" }), /useful job field/);
});

test("extractLinkedinJobIdFromUrl supports view and search URLs", () => {
  assert.equal(extractLinkedinJobIdFromUrl("https://www.linkedin.com/jobs/view/4428934873/"), "4428934873");
  assert.equal(extractLinkedinJobIdFromUrl("https://www.linkedin.com/jobs/search/?currentJobId=777"), "777");
});
