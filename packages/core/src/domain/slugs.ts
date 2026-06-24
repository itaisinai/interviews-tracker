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

export const EMPTY_INTERACTION_SLUG = "interaction";

export function createInteractionSlug(companyName: string, title: string) {
  const normalized = `${companyName} ${title}`
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || EMPTY_INTERACTION_SLUG;
}

export function createInteractionTitle(type: string, stage?: string | null) {
  const parts = [type, stage].filter((part): part is string => Boolean(part?.trim()));
  return parts.join(" ") || "interaction";
}

export function appendSlugCollisionSuffix(baseSlug: string, index: number) {
  return index <= 1 ? baseSlug : `${baseSlug}-${index}`;
}
