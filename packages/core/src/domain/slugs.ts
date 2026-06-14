export const EMPTY_OPPORTUNITY_SLUG = "opportunity";

export function createOpportunitySlug(companyName: string, roleTitle: string) {
  const normalized = `${companyName} ${roleTitle}`
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || EMPTY_OPPORTUNITY_SLUG;
}

export function appendSlugCollisionSuffix(baseSlug: string, index: number) {
  return index <= 1 ? baseSlug : `${baseSlug}-${index}`;
}
