/**
 * Public DTO transformers that remove internal database IDs from API responses.
 * Part of slug-first architecture - frontend should never see or use DB IDs.
 */

import type { Interaction, JobOpportunity, Person, PersonResearch } from "@prisma/client";

/**
 * Remove internal ID from Opportunity response
 */
export function toOpportunityPublicDTO<T extends JobOpportunity>(opportunity: T) {
  const { id, ...rest } = opportunity;
  return rest;
}

/**
 * Remove internal ID from Interaction response
 */
export function toInteractionPublicDTO<T extends Interaction>(interaction: T) {
  const { id, jobOpportunityId, ...rest } = interaction;
  return rest;
}

/**
 * Remove internal ID from Person response
 */
export function toPersonPublicDTO<T extends Person & { research?: PersonResearch | null }>(person: T) {
  const { id, companyId, research, ...rest } = person;

  // Also strip ID from nested research
  const publicResearch = research ? toPersonResearchPublicDTO(research) : null;

  return {
    ...rest,
    research: publicResearch,
  };
}

/**
 * Remove internal ID from PersonResearch response
 */
export function toPersonResearchPublicDTO<T extends PersonResearch>(research: T) {
  const { id, personId, ...rest } = research;
  return rest;
}

/**
 * Type helper: infer public DTO type from transformer
 */
export type PublicDTO<T> = T extends JobOpportunity
  ? Omit<T, "id">
  : T extends Interaction
    ? Omit<T, "id" | "jobOpportunityId">
    : T extends Person
      ? Omit<T, "id" | "jobOpportunityId">
      : T;
