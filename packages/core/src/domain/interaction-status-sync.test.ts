import assert from "node:assert/strict";
import { test } from "node:test";

import { deriveOpportunityStatusFromInteractions } from "./interaction-status-sync.js";

test("derives rejected opportunity status from rejected interaction", () => {
  const status = deriveOpportunityStatusFromInteractions([
    {
      type: "Interview",
      status: "REJECTED",
      date: "2026-06-08T08:30:00.000Z",
      stage: "Interview",
      outcome: "Rejected after technical round",
    },
  ]);

  assert.equal(status, "REJECTED");
});

test("derives phone done opportunity status from waiting-for-response interview", () => {
  const status = deriveOpportunityStatusFromInteractions([
    {
      type: "Phone Call",
      status: "NEEDS_FOLLOW_UP",
      date: "2026-06-08T08:30:00.000Z",
      stage: "Interview",
      followUp: "Waiting for response",
    },
  ]);

  assert.equal(status, "PHONE_DONE");
});

test("derives phone done opportunity status from legacy phone interview type", () => {
  const status = deriveOpportunityStatusFromInteractions([
    {
      type: "Phone Interview",
      status: "SCHEDULED",
      date: "2026-06-08T08:30:00.000Z",
      stage: "Interview",
    },
  ]);

  assert.equal(status, "PHONE_SCHEDULED");
});
