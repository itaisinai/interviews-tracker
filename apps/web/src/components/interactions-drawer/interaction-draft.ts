import type { Interaction, InteractionDraft } from "../../lib/types";
import { normalizeInteractionType } from "../../lib/enum-labels";

export function interactionToDraft(interaction: Interaction): InteractionDraft {
  return {
    date: interaction.date,
    endDate: interaction.endDate ?? null,
    type: normalizeInteractionType(interaction.type),
    stage: interaction.stage ?? null,
    status: interaction.status,
    personName: interaction.personName ?? null,
    personRole: interaction.personRole ?? null,
    agenda: interaction.agenda ?? null,
    meetingLink: interaction.meetingLink ?? null,
    gmailMessageId: interaction.gmailMessageId ?? null,
    notes: interaction.notes ?? null,
    outcome: interaction.outcome ?? null,
    followUp: interaction.followUp ?? null,
  };
}
