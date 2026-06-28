import test from "node:test";
import assert from "node:assert/strict";
import { LinkedinJobImportService, extractLinkedinJobIdFromUrl, linkedinJobImportInputSchema, type NormalizedLinkedinJob } from "./linkedin-job-import-service.js";

const normalized: NormalizedLinkedinJob = {
  company: {
    name: "Example Company",
    linkedinUrl: "https://www.linkedin.com/company/example/",
    website: null,
    description: "Builds useful developer tools.",
    industry: "Developer Tools"
  },
  opportunity: {
    title: "Senior Full Stack Engineer",
    location: "Tel Aviv District, Israel",
    workplaceType: "hybrid",
    employmentType: "Full-time",
    seniority: "Senior",
    description: "Work on product engineering.",
    requirements: ["TypeScript", "Node.js"],
    niceToHave: ["React"],
    responsibilities: ["Build APIs"],
    technologies: ["TypeScript", "Node.js", "React"],
    summary: "Senior full-stack role on developer tooling.",
    originalJobDescription: "Original LinkedIn description"
  },
  metadata: {
    source: "linkedin",
    sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/",
    linkedinJobId: "4428934873",
    extractedAt: "2026-06-28T12:00:00.000Z"
  },
  warnings: ["Check compensation manually"]
};

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

test("valid LinkedIn import maps LLM output into createOpportunity input", async () => {
  let createInput: unknown;
  let createOwner: string | undefined;
  const service = new LinkedinJobImportService({
    normalizer: { normalize: async () => normalized },
    findDuplicate: async () => null,
    createOpportunity: async (input, ownerEmail) => {
      createInput = input;
      createOwner = ownerEmail;
      return { id: "opp_1", companyName: input.companyName, sourceUrl: input.sourceUrl ?? null, linkedinJobId: input.linkedinJobId ?? null };
    }
  });

  const result = await service.importFromLinkedin({
    sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/",
    rawText: "Senior Full Stack Engineer at Example Company",
    extractedAt: "2026-06-28T12:00:00.000Z"
  }, "user@example.com");

  assert.equal(createOwner, "user@example.com");
  assert.deepEqual(createInput, {
    companyName: "Example Company",
    companySearchName: "Example Company",
    roleTitle: "Senior Full Stack Engineer",
    pipelineType: "POTENTIAL",
    status: "RESEARCH_LEAD",
    priority: "MEDIUM",
    source: "linkedin",
    jobUrl: "https://www.linkedin.com/jobs/view/4428934873/",
    sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/",
    linkedinUrl: "https://www.linkedin.com/company/example/",
    linkedinJobId: "4428934873",
    location: "Tel Aviv District, Israel",
    companyDescription: "Builds useful developer tools.",
    productDescription: "Industry: Developer Tools",
    techStack: "TypeScript, Node.js, React",
    notes: "Senior full-stack role on developer tooling.\n\nEmployment type: Full-time\n\nSeniority: Senior\n\nWorkplace type: hybrid\n\nWork on product engineering.\n\nResponsibilities:\n- Build APIs\n\nRequirements:\n- TypeScript\n- Node.js\n\nNice to have:\n- React\n\nOriginal job description:\nOriginal LinkedIn description",
    nextStep: "Review imported LinkedIn job details",
    domainIds: []
  });
  assert.equal(result.created, true);
  assert.equal(result.duplicate, false);
  assert.deepEqual(result.warnings, ["Check compensation manually"]);
});

test("duplicate LinkedIn import returns existing opportunity without normalizing or creating", async () => {
  let normalizedCalled = false;
  let createCalled = false;
  const service = new LinkedinJobImportService({
    normalizer: { normalize: async () => { normalizedCalled = true; return normalized; } },
    findDuplicate: async () => ({ id: "opp_existing", companyName: "Example Company", sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/", linkedinJobId: "4428934873" }),
    createOpportunity: async () => { createCalled = true; throw new Error("should not create"); }
  });

  const result = await service.importFromLinkedin({ sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/", rawText: "Useful content" }, "user@example.com");

  assert.equal(normalizedCalled, false);
  assert.equal(createCalled, false);
  assert.equal(result.created, false);
  assert.equal(result.duplicate, true);
  assert.equal(result.opportunityId, "opp_existing");
});

test("missing optional normalized fields do not break import", async () => {
  const minimal: NormalizedLinkedinJob = {
    company: { name: "Minimal Co", linkedinUrl: null, website: null, description: null, industry: null },
    opportunity: { title: "Engineer", location: null, workplaceType: null, employmentType: null, seniority: null, description: null, requirements: [], niceToHave: [], responsibilities: [], technologies: [], summary: null, originalJobDescription: null },
    metadata: { source: "linkedin", sourceUrl: "https://www.linkedin.com/jobs/view/1/", linkedinJobId: "1", extractedAt: "2026-06-28T12:00:00.000Z" },
    warnings: []
  };
  const service = new LinkedinJobImportService({
    normalizer: { normalize: async () => minimal },
    findDuplicate: async () => null,
    createOpportunity: async (input) => ({ id: "opp_min", companyName: input.companyName, sourceUrl: input.sourceUrl ?? null, linkedinJobId: input.linkedinJobId ?? null })
  });

  const result = await service.importFromLinkedin({ sourceUrl: "https://www.linkedin.com/jobs/view/1/", title: "Engineer" }, "user@example.com");
  assert.equal(result.created, true);
  assert.equal(result.companyName, "Minimal Co");
});
