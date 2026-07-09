import assert from "node:assert/strict";
import test from "node:test";

import {
  buildGlobalSearchResults,
  countSearchResults,
  flattenSearchResults,
  SEARCH_DEBOUNCE_MS,
} from "./global-search.js";
import type { CompanySummary, Interaction, Opportunity } from "./types.js";

const company = {
  id: "company-1",
  slug: "reevol",
  name: "Reevol",
  domains: ["Fintech"],
  location: "Tel Aviv, Israel",
  rolesCount: 1,
  activeProcesses: 1,
  potentialOpportunities: 0,
  interactionsCount: 2,
  priority: "HIGH",
  status: "RESEARCH_LEAD",
  isWatchlisted: false,
  updatedAt: "2026-06-16T00:00:00.000Z",
} as CompanySummary;
const opportunity = {
  slug: "reevol-senior",
  companyId: "company-1",
  company: { id: "company-1", slug: "reevol", name: "Reevol" },
  roleTitle: "Senior Full Stack Developer",
  status: "APPLIED",
  pipelineType: "ACTIVE_PROCESS",
  priority: "HIGH",
  updatedAt: "2026-06-16T00:00:00.000Z",
  interactions: [],
  notesList: [],
  tasks: [],
  domains: [],
  ownerEmail: "test@example.com",
} as unknown as Opportunity;
const interactions = [
  {
    slug: "int-1",
    ownerEmail: "test@example.com",
    jobOpportunityId: "opp-1",
    type: "Interview",
    status: "SCHEDULED",
    date: "2026-06-17T14:00:00.000Z",
    jobOpportunity: opportunity,
  },
  {
    slug: "int-2",
    ownerEmail: "test@example.com",
    jobOpportunityId: "opp-1",
    type: "Phone Call",
    status: "SCHEDULED",
    date: "2026-06-16T12:30:00.000Z",
    jobOpportunity: opportunity,
  },
] as Interaction[];

test("global search debounce delay stays in the requested range", () => {
  assert.ok(SEARCH_DEBOUNCE_MS >= 300 && SEARCH_DEBOUNCE_MS <= 500);
});

test("global search groups companies, opportunities, and interactions", () => {
  const results = buildGlobalSearchResults({
    companies: [company],
    opportunities: [opportunity],
    interactions,
    query: "ree",
  });
  assert.equal(results.companies[0]?.title, "Reevol");
  assert.equal(results.opportunities[0]?.title, "Senior Full Stack Developer");
  assert.equal(results.interactions.length, 2);
  assert.equal(countSearchResults(results), 4);
});

test("global search suppresses empty and very short queries", () => {
  const results = buildGlobalSearchResults({
    companies: [company],
    opportunities: [opportunity],
    interactions,
    query: "r",
  });
  assert.equal(countSearchResults(results), 0);
});

test("topbar dropdown consumers can cap flattened results at five", () => {
  const manyInteractions = Array.from({ length: 8 }, (_, index) => ({
    ...interactions[0],
    slug: `int-${index}`,
    notes: "ree note",
  })) as Interaction[];
  const results = buildGlobalSearchResults({
    companies: [company],
    opportunities: [opportunity],
    interactions: manyInteractions,
    query: "ree",
  });
  assert.equal(flattenSearchResults(results).slice(0, 5).length, 5);
});

test("no-results query returns empty grouped collections", () => {
  const results = buildGlobalSearchResults({
    companies: [company],
    opportunities: [opportunity],
    interactions,
    query: "xyz",
  });
  assert.deepEqual(results, { companies: [], opportunities: [], interactions: [] });
});
