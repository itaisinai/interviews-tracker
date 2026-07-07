/**
 * Response serializers that remove internal database IDs from API responses.
 * Part of slug-first architecture - frontend should never see DB IDs.
 */

import type { JobOpportunity, Interaction, Person, PersonResearch, Compensation } from "@prisma/client";

/**
 * Remove internal IDs from opportunity response
 */
export function serializeOpportunity<T extends Record<string, any>>(opportunity: T): any {
  const { id, companyId, workModelId, ...rest } = opportunity;

  // Recursively clean nested relations
  if ('interactions' in opportunity && Array.isArray((opportunity as any).interactions)) {
    (rest as any).interactions = (opportunity as any).interactions.map((i: any) => serializeInteraction(i));
  }

  if ('compensation' in opportunity && (opportunity as any).compensation) {
    (rest as any).compensation = serializeCompensation((opportunity as any).compensation);
  }

  if ('company' in opportunity && (opportunity as any).company) {
    (rest as any).company = serializeCompany((opportunity as any).company);
  }

  return rest;
}

/**
 * Remove internal IDs from interaction response
 */
export function serializeInteraction<T extends Record<string, any>>(interaction: T): any {
  const { id, jobOpportunityId, ...rest } = interaction;

  // Clean nested jobOpportunity if included
  if ('jobOpportunity' in interaction && (interaction as any).jobOpportunity) {
    (rest as any).jobOpportunity = serializeOpportunity((interaction as any).jobOpportunity);
  }

  return rest;
}

/**
 * Remove internal IDs from person response
 */
export function serializePerson<T extends Record<string, any>>(person: T): any {
  const { id, companyId, ...rest } = person;

  // Clean nested research
  if ('research' in person && (person as any).research) {
    const { id: researchId, personId, ...researchRest } = (person as any).research;
    (rest as any).research = researchRest;
  }

  // Clean nested company
  if ('company' in person && (person as any).company) {
    (rest as any).company = serializeCompany((person as any).company);
  }

  return rest;
}

/**
 * Remove internal IDs from compensation response
 */
export function serializeCompensation<T extends Record<string, any>>(compensation: T): any {
  const { id, jobOpportunityId, ...rest } = compensation;
  return rest;
}

/**
 * Remove internal IDs from company
 */
export function serializeCompany<T extends Record<string, any>>(company: T): any {
  const { id, employeesRangeId, companyStageId, ...rest } = company;

  // Clean nested opportunities
  if ('opportunities' in company && Array.isArray((company as any).opportunities)) {
    (rest as any).opportunities = (company as any).opportunities.map((o: any) => serializeOpportunity(o));
  }

  // Clean nested contacts
  if ('contacts' in company && Array.isArray((company as any).contacts)) {
    (rest as any).contacts = (company as any).contacts.map((p: any) => serializePerson(p));
  }

  return rest;
}

/**
 * Remove internal IDs from company summary
 */
export function serializeCompanySummary<T extends Record<string, any>>(company: T): any {
  return serializeCompany(company);
}

/**
 * Remove internal IDs from company detail
 */
export function serializeCompanyDetail<T extends Record<string, any>>(company: T): T {
  return serializeCompany(company);
}

/**
 * Serialize array of opportunities
 */
export function serializeOpportunities<T extends Record<string, any>>(opportunities: T[]): any[] {
  return opportunities.map(serializeOpportunity);
}

/**
 * Serialize array of interactions
 */
export function serializeInteractions<T extends Record<string, any>>(interactions: T[]): any[] {
  return interactions.map(serializeInteraction);
}

/**
 * Serialize array of people
 */
export function serializePeople<T extends Record<string, any>>(people: T[]): any[] {
  return people.map(serializePerson);
}
