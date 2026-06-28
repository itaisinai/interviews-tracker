import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { errorHandler } from "../lib/http.js";
import { jobImportsRouter, resetLinkedinJobImportServiceFactoryForTests, setLinkedinJobImportServiceFactoryForTests } from "./job-imports.js";
import { LinkedinJobImportService, type NormalizedLinkedinJob } from "../services/job-imports/linkedin-job-import-service.js";

const validPayload = {
  sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/",
  rawText: "Senior Full Stack Engineer at Example Company",
  extractedAt: "2026-06-28T12:00:00.000Z"
};

const normalized: NormalizedLinkedinJob = {
  company: { name: "Example Company", linkedinUrl: null, website: null, description: "Developer tools company.", industry: null },
  opportunity: { title: "Senior Full Stack Engineer", location: "Tel Aviv", workplaceType: "hybrid", employmentType: "Full-time", seniority: "Senior", description: "Build APIs.", requirements: ["Node.js"], niceToHave: [], responsibilities: [], technologies: ["Node.js"], summary: "Backend-leaning full-stack role.", originalJobDescription: null },
  metadata: { source: "linkedin", sourceUrl: validPayload.sourceUrl, linkedinJobId: "4428934873", extractedAt: validPayload.extractedAt },
  warnings: []
};

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((request, _response, next) => {
    request.auth = { email: "user@example.com" };
    next();
  });
  app.use("/api/job-imports", jobImportsRouter);
  app.use(errorHandler);
  return app;
}

async function postJson(path: string, body: unknown) {
  const app = createTestApp();
  const server = app.listen(0);
  try {
    const address = server.address();
    assert.notEqual(address, null);
    assert.notEqual(typeof address, "string");
    if (!address || typeof address === "string") throw new Error("Expected TCP test server address.");
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const json = await response.json();
    return { status: response.status, json };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

afterEach(() => resetLinkedinJobImportServiceFactoryForTests());

test("POST /api/job-imports/linkedin creates an opportunity for an authenticated valid payload", async () => {
  let createCalled = false;
  let createOwner: string | undefined;
  setLinkedinJobImportServiceFactoryForTests(() => new LinkedinJobImportService({
    normalizer: { normalize: async () => normalized },
    findDuplicate: async () => null,
    createOpportunity: async (input, ownerEmail) => {
      createCalled = true;
      createOwner = ownerEmail;
      assert.equal(input.companyName, "Example Company");
      assert.equal(input.jobUrl, validPayload.sourceUrl);
      assert.equal(input.sourceUrl, validPayload.sourceUrl);
      assert.equal(input.linkedinJobId, "4428934873");
      return { id: "opp_created", companyName: input.companyName, sourceUrl: input.sourceUrl ?? null, linkedinJobId: input.linkedinJobId ?? null };
    }
  }));

  const response = await postJson("/api/job-imports/linkedin", validPayload);

  assert.equal(response.status, 201);
  assert.equal(response.json.created, true);
  assert.equal(response.json.opportunityId, "opp_created");
  assert.equal(createCalled, true);
  assert.equal(createOwner, "user@example.com");
});

test("POST /api/job-imports/linkedin returns 200 for a duplicate import", async () => {
  setLinkedinJobImportServiceFactoryForTests(() => new LinkedinJobImportService({
    normalizer: { normalize: async () => { throw new Error("should not normalize duplicate"); } },
    findDuplicate: async () => ({ id: "opp_existing", companyName: "Example Company", sourceUrl: validPayload.sourceUrl, linkedinJobId: "4428934873" }),
    createOpportunity: async () => { throw new Error("should not create duplicate"); }
  }));

  const response = await postJson("/api/job-imports/linkedin", validPayload);

  assert.equal(response.status, 200);
  assert.equal(response.json.created, false);
  assert.equal(response.json.duplicate, true);
  assert.equal(response.json.opportunityId, "opp_existing");
});

test("POST /api/job-imports/linkedin returns 400 for invalid payload", async () => {
  setLinkedinJobImportServiceFactoryForTests(() => new LinkedinJobImportService({
    normalizer: { normalize: async () => { throw new Error("should not normalize invalid payload"); } },
    findDuplicate: async () => null,
    createOpportunity: async () => { throw new Error("should not create invalid payload"); }
  }));

  const response = await postJson("/api/job-imports/linkedin", { sourceUrl: "https://www.linkedin.com/jobs/view/4428934873/" });

  assert.equal(response.status, 400);
  assert.equal(response.json.message, "Validation failed");
});
