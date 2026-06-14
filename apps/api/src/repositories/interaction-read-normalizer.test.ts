import assert from "node:assert/strict";
import { test } from "node:test";

import { promoteOverdueInteractionsForRead } from "./interaction-read-normalizer.js";

test("overdue interactions before a later interaction keep their historical status", () => {
  const interactions = [
    {
      id: "interaction-a",
      jobOpportunityId: "opportunity-1",
      date: "2026-06-08T11:00:00.000Z",
      type: "Phone Call",
      status: "SCHEDULED" as const
    },
    {
      id: "interaction-b",
      jobOpportunityId: "opportunity-1",
      date: "2026-06-09T11:00:00.000Z",
      type: "Rejection",
      status: "REJECTED" as const
    }
  ];

  const promoted = promoteOverdueInteractionsForRead(interactions, new Date("2026-06-10T00:00:00.000Z"));

  assert.equal(promoted[0].status, "SCHEDULED");
  assert.equal(promoted[1].status, "REJECTED");
});

test("only the latest overdue scheduled interaction becomes needs follow-up", () => {
  const interactions = [
    {
      id: "interaction-a",
      jobOpportunityId: "opportunity-1",
      date: "2026-06-08T11:00:00.000Z",
      type: "Phone Call",
      status: "SCHEDULED" as const
    },
    {
      id: "interaction-b",
      jobOpportunityId: "opportunity-1",
      date: "2026-06-09T11:00:00.000Z",
      type: "Interview",
      status: "SCHEDULED" as const
    }
  ];

  const promoted = promoteOverdueInteractionsForRead(interactions, new Date("2026-06-10T00:00:00.000Z"));

  assert.equal(promoted[0].status, "SCHEDULED");
  assert.equal(promoted[1].status, "NEEDS_FOLLOW_UP");
});

test("overdue interactions without later activity become needs follow-up", () => {
  const interactions = [
    {
      id: "interaction-a",
      jobOpportunityId: "opportunity-1",
      date: "2026-06-08T11:00:00.000Z",
      type: "Phone Call",
      status: "SCHEDULED" as const
    }
  ];

  const promoted = promoteOverdueInteractionsForRead(interactions, new Date("2026-06-10T00:00:00.000Z"));

  assert.equal(promoted[0].status, "NEEDS_FOLLOW_UP");
});
