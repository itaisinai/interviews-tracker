/**
 * Response serializers that remove internal database IDs from API responses.
 * Part of slug-first architecture - frontend should never see DB IDs.
 */

import type { JobOpportunity, Interaction, Person, PersonResearch, Compensation } from "@prisma/client";

/**
 * Remove internal IDs from opportunity response
 */
export function serializeOpportunity<T extends Record<string, any>>(opportunity: T): Omit<T, 'id'> {
  const { id, ...rest } = opportunity;

  // Recursively clean nested relations
  if ('interactions' in rest && Array.isArray(rest.interactions)) {
    rest.interactions = rest.interactions.map((i: any) => serializeInteraction(i));
  }

  if ('compensation' in rest && rest.compensation) {
    rest.compensation = serializeCompensation(rest.compensation);
  }

  return rest as Omit<T, 'id'>;
}

/**
 * Remove internal IDs from interaction response
 */
export function serializeInteraction<T extends Record<string, any>>(interaction: T): Omit<T, 'id' | 'jobOpportunityId'> {
  const { id, jobOpportunityId, ...rest } = interaction;

  // Clean nested jobOpportunity if included
  if ('jobOpportunity' in rest && rest.jobOpportunity) {
    rest.jobOpportunity = serializeOpportunity(rest.jobOpportunity);
  }

  return rest as Omit<T, 'id' | 'jobOpportunityId'>;
}

/**
 * Remove internal IDs from person response
 */
export function serializePerson<T extends Record<string, any>>(person: T): Omit<T, 'id' | 'jobOpportunityId'> {
  const { id, jobOpportunityId, ...rest } = person;

  // Clean nested research
  if ('research' in rest && rest.research) {
    const { id: researchId, personId, ...researchRest } = rest.research;
    rest.research = researchRest;
  }

  return rest as Omit<T, 'id' | 'jobOpportunityId'>;
}

/**
 * Remove internal IDs from compensation response
 */
export function serializeCompensation<T extends Record<string, any>>(compensation: T): Omit<T, 'id' | 'jobOpportunityId'> {
  const { id, jobOpportunityId, ...rest } = compensation;
  return rest as Omit<T, 'id' | 'jobOpportunityId'>;
}

/**
 * Remove internal IDs from company summary
 */
export function serializeCompanySummary<T extends Record<string, any>>(company: T): T {
  // Company is virtual, no IDs to remove
  // But clean nested opportunities if present
  if ('opportunities' in company && Array.isArray(company.opportunities)) {
    company.opportunities = company.opportunities.map((o: any) => serializeOpportunity(o));
  }

  return company;
}

/**
 * Remove internal IDs from company detail
 */
export function serializeCompanyDetail<T extends Record<string, any>>(company: T): T {
  return serializeCompanySummary(company);
}

/**
 * Serialize array of opportunities
 */
export function serializeOpportunities<T extends Record<string, any>>(opportunities: T[]): Array<Omit<T, 'id'>> {
  return opportunities.map(serializeOpportunity);
}

/**
 * Serialize array of interactions
 */
export function serializeInteractions<T extends Record<string, any>>(interactions: T[]): Array<Omit<T, 'id' | 'jobOpportunityId'>> {
  return interactions.map(serializeInteraction);
}

/**
 * Serialize array of people
 */
export function serializePeople<T extends Record<string, any>>(people: T[]): Array<Omit<T, 'id' | 'jobOpportunityId'>> {
  return people.map(serializePerson);
}
