import type { Person } from "./types";

/**
 * Normalize company name for comparison
 * Handles: "Alta | AI GTM System" → "alta", "Company Inc." → "company"
 */
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .split("|")[0] // Take only the first part before pipe separator
    .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\.?$/i, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Detect if person's researched current company doesn't match the opportunity company
 */
export function detectCompanyMismatch(person: Person, opportunityCompanyName: string): boolean {
  // No mismatch if no research data
  if (!person.research || !person.company) {
    return false;
  }

  const personCompany = normalizeCompanyName(person.company);
  const opportunityCompany = normalizeCompanyName(opportunityCompanyName);

  // No mismatch if companies match
  if (personCompany === opportunityCompany) {
    return false;
  }

  // Mismatch detected
  return true;
}

/**
 * Get current company from person's research experience
 */
export function getCurrentCompanyFromResearch(person: Person): string | null {
  if (!person.research?.experience) {
    return null;
  }

  const experience = person.research.experience as Array<{
    company: string;
    positions: Array<{
      title: string;
      dates?: string;
    }>;
  }>;

  // Find the experience with a "Present" position
  const currentExperience = experience.find((exp) => exp.positions.some((pos) => pos.dates?.includes("Present")));

  return currentExperience?.company || experience[0]?.company || null;
}
