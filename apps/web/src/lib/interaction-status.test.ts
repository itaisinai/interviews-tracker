import assert from "node:assert/strict";
import { test } from "node:test";

import { getInteractionTimelineBadgeMeta } from "./interaction-status.js";

test("older interactions hide status badges when a later terminal event exists", () => {
  const interactions = [
    {
      id: "interaction-a",
      date: "2026-06-08T11:00:00.000Z",
      type: "Phone Call" as const,
      status: "SCHEDULED" as const,
      stage: "Interview",
      outcome: null,
      followUp: null
    },
    {
      id: "interaction-b",
      date: "2026-06-09T11:00:00.000Z",
      type: "Rejection" as const,
      status: "REJECTED" as const,
      stage: null,
      outcome: "The company decided not to continue.",
      followUp: null
    }
  ];

  assert.equal(getInteractionTimelineBadgeMeta(interactions[0], interactions), null);
  assert.equal(getInteractionTimelineBadgeMeta(interactions[1], interactions), null);
});

test("completed interactions still show a passed badge when unresolved", () => {
  const interactions = [
    {
      id: "interaction-a",
      date: "2026-06-08T11:00:00.000Z",
      type: "Interview" as const,
      status: "DONE" as const,
      stage: "Interview",
      outcome: "Advanced to technical interview",
      followUp: null
    }
  ];

  assert.deepEqual(getInteractionTimelineBadgeMeta(interactions[0], interactions), {
    label: "Passed",
    tone: "green"
  });
});
