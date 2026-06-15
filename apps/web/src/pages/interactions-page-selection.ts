import type { Interaction, Opportunity } from "../lib/types";

export function buildSelectedOpportunityForInteraction(
  interaction: Interaction,
  loadedInteractions: readonly Interaction[],
  loadedOpportunities: readonly Opportunity[],
): Opportunity | null {
  const opportunityInteractions = loadedInteractions.filter(
    (item) => item.jobOpportunityId === interaction.jobOpportunityId,
  );
  const baseOpportunity =
    interaction.jobOpportunity ??
    loadedOpportunities.find(
      (item) => item.id === interaction.jobOpportunityId,
    ) ??
    null;

  return baseOpportunity
    ? {
        ...baseOpportunity,
        interactions: opportunityInteractions,
      }
    : null;
}
