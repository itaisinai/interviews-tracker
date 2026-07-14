import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { Interaction, Opportunity } from "../lib/types.js";

import { buildSelectedOpportunityForInteraction } from "./interactions-page-selection.js";

const baseOpportunity = {
  slug: "acme-engineer",
  companyId: "company-1",
  company: {
    id: "company-1",
    slug: "acme",
    name: "Acme",
  },
  roleTitle: "Engineer",
  pipelineType: "ACTIVE_PROCESS",
  status: "TECHNICAL_SCHEDULED",
  updatedAt: "2026-06-10T00:00:00.000Z",
  domains: [],
  interactions: [],
  notesList: [],
  tasks: [],
  ownerEmail: "test@example.com",
} as unknown as Opportunity;

const interactionA = {
  slug: "interaction-a",
  ownerEmail: "test@example.com",
  jobOpportunityId: "opp-1",
  date: "2026-06-11T10:00:00.000Z",
  type: "Phone Call",
  status: "DONE",
  jobOpportunity: baseOpportunity,
} as Interaction;

const interactionB = {
  slug: "interaction-b",
  ownerEmail: "test@example.com",
  jobOpportunityId: "opp-1",
  date: "2026-06-12T10:00:00.000Z",
  type: "Interview",
  status: "SCHEDULED",
  jobOpportunity: baseOpportunity,
} as Interaction;

const otherInteraction = {
  slug: "interaction-c",
  ownerEmail: "test@example.com",
  jobOpportunityId: "opp-2",
  date: "2026-06-13T10:00:00.000Z",
  type: "Email",
  status: "SCHEDULED",
} as Interaction;

test("opening an interaction drawer builds selected opportunity from already-loaded interactions", () => {
  const selectedOpportunity = buildSelectedOpportunityForInteraction(
    interactionA,
    [interactionA, interactionB, otherInteraction],
    []
  );

  assert.equal(selectedOpportunity?.slug, "acme-engineer");
  assert.deepEqual(
    selectedOpportunity?.interactions.map((interaction) => interaction.slug),
    ["interaction-a", "interaction-b"]
  );
});

test("rebuilding selected opportunity reflects updated loaded interactions after refetch", () => {
  const updatedInteraction = {
    ...interactionA,
    outcome: "Advanced after onsite",
  } as Interaction;

  const selectedOpportunity = buildSelectedOpportunityForInteraction(
    updatedInteraction,
    [updatedInteraction, interactionB],
    []
  );

  assert.equal(selectedOpportunity?.interactions[0]?.outcome, "Advanced after onsite");
});

test("interactions drawer does not fetch opportunity data just because it opened", () => {
  const source = readFileSync(
    new URL("../components/interactions-drawer/interactions-drawer.tsx", import.meta.url),
    "utf8"
  );

  assert.equal(/\buseQuery\s*\(/.test(source), false);
  assert.equal(/api\.opportunity\s*\(/.test(source), false);
});
