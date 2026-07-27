import assert from "node:assert/strict";
import test from "node:test";

import { type CompanyResearchJobInput, InProcessCompanyResearchJobService } from "./company-research-job-service.js";

const input: CompanyResearchJobInput = {
  companyId: "company-1",
  companyName: "Acme",
  opportunityId: "opportunity-1",
  roleTitle: "Engineer",
  ownerEmail: "owner@example.com",
};

test("enqueue returns before company research executor settles", async () => {
  let resolve!: () => void;
  let started = false;
  const pending = new Promise<void>((done) => {
    resolve = done;
  });
  const service = new InProcessCompanyResearchJobService(async () => {
    started = true;
    await pending;
  });

  service.enqueue(input);
  assert.equal(started, false);
  await new Promise<void>((done) => setImmediate(done));
  assert.equal(started, true);
  resolve();
});

test("executor rejection is caught and does not become an unhandled rejection", async () => {
  let unhandled = false;
  const listener = () => {
    unhandled = true;
  };
  process.once("unhandledRejection", listener);
  const service = new InProcessCompanyResearchJobService(async () => {
    throw new Error("provider failed");
  });

  service.enqueue({ ...input, companyId: "company-2" });
  await new Promise<void>((done) => setImmediate(() => setImmediate(done)));
  process.removeListener("unhandledRejection", listener);
  assert.equal(unhandled, false);
});
