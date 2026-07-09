import type { Interaction, Opportunity } from "../lib/types";

export function buildSelectedOpportunityForInteraction(
  interaction: Interaction,
  loadedInteractions: readonly Interaction[],
  loadedOpportunities: readonly Opportunity[]
): Opportunity | null {
  // Get opportunity slug from nested object
  const opportunitySlug = interaction.jobOpportunity?.slug;

  if (!opportunitySlug) {
    return null;
  }

  const opportunityInteractions = loadedInteractions.filter((item) => item.jobOpportunity?.slug === opportunitySlug);

  const baseOpportunity =
    interaction.jobOpportunity ?? loadedOpportunities.find((item) => item.slug === opportunitySlug) ?? null;

  return baseOpportunity
    ? {
        ...baseOpportunity,
        interactions: opportunityInteractions,
      }
    : null;
}
