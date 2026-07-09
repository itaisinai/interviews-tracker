import assert from "node:assert/strict";
import test from "node:test";

import type { Interaction } from "../../lib/types";

import { interactionToDraft } from "./interaction-draft.js";

test("initializes every editable field from the current interaction", () => {
  const interaction: Interaction = {
    slug: "alta-interview-technical",
    ownerEmail: "owner@example.com",
    jobOpportunityId: "opportunity-1",
    date: "2026-06-22T09:00:00.000Z",
    endDate: "2026-06-22T10:00:00.000Z",
    type: "Interview",
    stage: "Technical",
    status: "DONE",
    personName: "Ada Lovelace",
    personRole: "Engineering Manager",
    agenda: "System design",
    meetingLink: "https://meet.example.com/interview",
    gmailMessageId: "message-1",
    notes: "Current notes",
    outcome: "Advanced",
    followUp: "Send availability",
  };

  assert.deepEqual(interactionToDraft(interaction), {
    date: interaction.date,
    endDate: interaction.endDate,
    type: interaction.type,
    stage: interaction.stage,
    status: interaction.status,
    personName: interaction.personName,
    personRole: interaction.personRole,
    agenda: interaction.agenda,
    meetingLink: interaction.meetingLink,
    gmailMessageId: interaction.gmailMessageId,
    notes: interaction.notes,
    outcome: interaction.outcome,
    followUp: interaction.followUp,
  });
});
