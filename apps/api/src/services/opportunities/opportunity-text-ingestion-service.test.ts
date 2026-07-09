import assert from "node:assert/strict";
import test from "node:test";

import { buildOpportunityInputFromParsedJobDescription } from "./opportunity-text-ingestion-service.js";

test("buildOpportunityInputFromParsedJobDescription maps parser output to opportunity input", async () => {
  const input = await buildOpportunityInputFromParsedJobDescription({
    companyName: "ExampleCo",
    roleTitle: "Senior Backend Engineer",
    pipelineType: "ACTIVE_PROCESS",
    status: "RECRUITER_REACHED_OUT",
    prioritySuggestion: "HIGH",
    company: {
      employees: null,
      stage: null,
      domains: [],
      workModel: null,
      location: "Tel Aviv",
      funding: "Series B",
      customersTraction: "Enterprise customers",
      companyDescription: "Builds payments software",
      productDescription: "Payment automation",
    },
    role: {
      techStack: ["Node.js", "TypeScript"],
      backendFrontendSplit: "Backend-heavy",
      responsibilities: [],
      requirements: [],
      niceToHave: [],
      compensation: "Competitive",
    },
    process: {
      knownNextInteraction: null,
      knownContact: "Jane Recruiter",
      suggestedNextStep: "Reply with availability",
    },
    rawImportantNotes: ["Recruiter reached out", "Remote friendly"],
  });

  assert.equal(input.companyName, "ExampleCo");
  assert.equal(input.roleTitle, "Senior Backend Engineer");
  assert.equal(input.pipelineType, "ACTIVE_PROCESS");
  assert.equal(input.status, "RECRUITER_REACHED_OUT");
  assert.equal(input.priority, "HIGH");
  assert.equal(input.source, "Telegram opportunity webhook");
  assert.equal(input.referrerOrConnection, "Jane Recruiter");
  assert.equal(input.nextStep, "Reply with availability");
  // Company fields moved to Company entity (no longer on Opportunity)
  // assert.equal(input.location, "Tel Aviv");
  // assert.equal(input.funding, "Series B");
  // assert.equal(input.companyDescription, "Builds payments software");
  // assert.equal(input.productDescription, "Payment automation");
  // assert.equal(input.customersTraction, "Enterprise customers");
  // assert.equal(input.techStack, "Node.js, TypeScript");
  // assert.equal(input.backendFrontendSplit, "Backend-heavy");
  assert.equal(input.compensationNotes, "Competitive");
  assert.equal(input.notes, "Recruiter reached out\nRemote friendly");
  assert.deepEqual(input.domainIds, []);
});

test("buildOpportunityInputFromParsedJobDescription supplies safe defaults", async () => {
  const input = await buildOpportunityInputFromParsedJobDescription({
    companyName: null,
    roleTitle: null,
    pipelineType: null,
    status: null,
    prioritySuggestion: null,
    company: {
      employees: null,
      stage: null,
      domains: [],
      workModel: null,
      location: null,
      funding: null,
      customersTraction: null,
      companyDescription: null,
      productDescription: null,
    },
    role: {
      techStack: [],
      backendFrontendSplit: null,
      responsibilities: [],
      requirements: [],
      niceToHave: [],
      compensation: null,
    },
    process: {
      knownNextInteraction: null,
      knownContact: null,
      suggestedNextStep: null,
    },
    rawImportantNotes: [],
  });

  assert.equal(input.companyName, "Unknown company");
  assert.equal(input.roleTitle, "Software Engineer");
  assert.equal(input.pipelineType, "POTENTIAL");
  assert.equal(input.status, "RESEARCH_LEAD");
  assert.equal(input.priority, "MEDIUM");
  assert.deepEqual(input.domainIds, []);
});
