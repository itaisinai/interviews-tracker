import type { CompanySummary, Interaction, Opportunity } from "./types";

export const SEARCH_MIN_QUERY_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 350;

export type SearchCategory = "companies" | "opportunities" | "interactions";

export type SearchResult = {
  id: string;
  type: SearchCategory;
  title: string;
  subtitle: string;
  href: string;
  icon: string;
};

export type GlobalSearchResults = Record<SearchCategory, SearchResult[]>;

export const emptySearchResults = (): GlobalSearchResults => ({
  companies: [],
  opportunities: [],
  interactions: [],
});

export function normalizeSearchQuery(query: string) {
  return query.trim().toLowerCase();
}

function includesQuery(values: Array<string | null | undefined>, query: string) {
  return values.some((value) => value?.toLowerCase().includes(query));
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function buildGlobalSearchResults({
  companies,
  opportunities,
  interactions,
  query,
}: {
  companies: CompanySummary[];
  opportunities: Opportunity[];
  interactions: Interaction[];
  query: string;
}): GlobalSearchResults {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < SEARCH_MIN_QUERY_LENGTH) return emptySearchResults();

  return {
    companies: companies
      .filter((company) => includesQuery([company.name, company.location, company.funding, company.stage, ...company.domains], normalized))
      .map((company) => ({
        id: company.name,
        type: "companies",
        title: company.name,
        subtitle: [company.domains[0] ?? company.stage ?? "Company", company.location].filter(Boolean).join(" · "),
        href: `/companies/${company.slug}`,
        icon: "business",
      })),
    opportunities: opportunities
      .filter((opportunity) => includesQuery([opportunity.roleTitle, opportunity.name, opportunity.companySearchName, opportunity.status, opportunity.location, opportunity.notes], normalized))
      .map((opportunity) => ({
        id: opportunity.id,
        type: "opportunities",
        title: opportunity.roleTitle,
        subtitle: `${opportunity.name} · ${opportunity.status.replaceAll("_", " ").toLowerCase()}`,
        href: `/opportunities/${opportunity.slug || opportunity.id}`,
        icon: "work",
      })),
    interactions: interactions
      .filter((interaction) => includesQuery([interaction.type, interaction.stage, interaction.status, interaction.personName, interaction.personRole, interaction.agenda, interaction.notes, interaction.outcome, interaction.followUp, interaction.jobOpportunity?.name, interaction.jobOpportunity?.roleTitle], normalized))
      .map((interaction) => ({
        id: interaction.id,
        type: "interactions",
        title: interaction.type.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
        subtitle: `${interaction.jobOpportunity?.name ?? "Interaction"} · ${formatDate(interaction.date)}`,
        href: interaction.jobOpportunity ? `/opportunities/${interaction.jobOpportunity.slug || interaction.jobOpportunity.id}` : "/interactions",
        icon: interaction.type.toLowerCase().includes("phone") ? "call" : "event_note",
      })),
  };
}

export function flattenSearchResults(results: GlobalSearchResults) {
  return [...results.companies, ...results.opportunities, ...results.interactions];
}

export function countSearchResults(results: GlobalSearchResults) {
  return flattenSearchResults(results).length;
}
