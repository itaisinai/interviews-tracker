import assert from "node:assert/strict";
import { test } from "node:test";

import { getInteractionTimelineBadgeMeta, getOpportunityProcessBadgeMeta } from "./interaction-status.js";

test("older interactions hide status badges when a later interaction exists", () => {
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

test("older scheduled interactions do not show waiting when a later interview exists", () => {
  const interactions = [
    {
      id: "interaction-a",
      date: "2026-06-09T12:30:00.000Z",
      type: "Phone Call" as const,
      status: "SCHEDULED" as const,
      stage: "Interview",
      outcome: null,
      followUp: null
    },
    {
      id: "interaction-b",
      date: "2026-06-11T08:30:00.000Z",
      type: "Interview" as const,
      status: "SCHEDULED" as const,
      stage: "Interview",
      outcome: null,
      followUp: null
    }
  ];

  assert.equal(getInteractionTimelineBadgeMeta(interactions[0], interactions), null);
  assert.deepEqual(getInteractionTimelineBadgeMeta(interactions[1], interactions), {
    label: "Waiting for response",
    tone: "warning"
  });
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

test("company badge reflects rejected process state", () => {
  assert.deepEqual(
    getOpportunityProcessBadgeMeta(
      {
        status: "REJECTED",
        pipelineType: "ACTIVE_PROCESS"
      },
      []
    ),
    {
      label: "Rejected",
      tone: "red"
    }
  );
});

test("company badge reflects offer state as contract", () => {
  assert.deepEqual(
    getOpportunityProcessBadgeMeta(
      {
        status: "OFFER",
        pipelineType: "ACTIVE_PROCESS"
      },
      []
    ),
    {
      label: "Contract",
      tone: "violet"
    }
  );
});

test("company badge reflects active process", () => {
  assert.deepEqual(
    getOpportunityProcessBadgeMeta(
      {
        status: "PHONE_DONE",
        pipelineType: "ACTIVE_PROCESS"
      },
      [
        {
          type: "Interview" as const,
          status: "DONE" as const,
          outcome: "Advanced",
          followUp: null
        }
      ]
    ),
    {
      label: "In process",
      tone: "green"
    }
  );
});
