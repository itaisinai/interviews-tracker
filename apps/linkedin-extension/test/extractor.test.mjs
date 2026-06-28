import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractLinkedinJobData, getJobIdFromUrl } from "../src/extractor.js";

function makeDocument(html) {
  const bySelector = new Map();
  const text = (selector, value) => bySelector.set(selector, { innerText: value, textContent: value, outerHTML: `<div>${value}</div>` });
  text(".job-details-jobs-unified-top-card__job-title h1", html.match(/job-title\">([^<]+)/)?.[1] || "");
  text(".job-details-jobs-unified-top-card__company-name a", html.match(/<a>([^<]+)<\/a>/)?.[1] || "");
  text(".job-details-jobs-unified-top-card__primary-description-container", html.match(/primary-description-container\">([^<]+)/)?.[1] || "");
  text("#job-details", "About the job Build React and Node.js products. Requirements: TypeScript.");
  const body = { innerText: "Senior Full Stack Engineer Example Company Tel Aviv District Hybrid Full-time About the job Build React and Node.js products.", textContent: "", outerHTML: html };
  return {
    body,
    querySelector(selector) { return bySelector.get(selector) || (selector === "main" ? body : null); },
    querySelectorAll(selector) { return selector.includes("artdeco-pill") ? [{ innerText: "Hybrid" }, { innerText: "Full-time" }] : []; }
  };
}

test("extracts expected LinkedIn job payload fields", async () => {
  const html = await readFile(new URL("../fixtures/linkedin-job.html", import.meta.url), "utf8");
  const payload = extractLinkedinJobData(makeDocument(html), "https://www.linkedin.com/jobs/view/4428934873/");
  assert.equal(payload.title, "Senior Full Stack Engineer");
  assert.equal(payload.companyName, "Example Company");
  assert.equal(payload.location, "Tel Aviv District, Israel");
  assert.equal(payload.workplaceType, "Hybrid");
  assert.equal(payload.employmentType, "Full-time");
  assert.match(payload.descriptionText, /React/);
  assert.equal(payload.linkedinJobId, "4428934873");
});

test("handles missing fields gracefully", () => {
  const payload = extractLinkedinJobData({ body: { innerText: "", textContent: "" }, querySelector: () => null, querySelectorAll: () => [] }, "https://www.linkedin.com/jobs/search/?currentJobId=123");
  assert.equal(payload.title, null);
  assert.equal(payload.companyName, null);
  assert.equal(payload.linkedinJobId, "123");
});

test("extracts job ids from LinkedIn URL variants", () => {
  assert.equal(getJobIdFromUrl("https://www.linkedin.com/jobs/view/4428934873/"), "4428934873");
  assert.equal(getJobIdFromUrl("https://www.linkedin.com/jobs/search/?keywords=x&currentJobId=777"), "777");
});
