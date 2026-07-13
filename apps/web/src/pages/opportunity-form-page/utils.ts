import { jobStatusOptions } from "../../lib/enum-labels";
import type { JobStatus, Option } from "../../lib/types";

export function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function formatDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function friendlyParseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("API auth token is not ready") || message.includes("API auth token is empty")) {
    return "Your session is still loading. Wait a moment and try again.";
  }

  if (message.includes("Missing bearer token")) {
    return "Your session is not ready yet. Refresh the page and try again.";
  }

  if (message.includes("Validation failed")) {
    return "The parser could not validate this input. Try adjusting the pasted text and retry.";
  }

  return "The parser could not complete this run. Please try again.";
}

const validJobStatuses = new Set(jobStatusOptions.map((item) => item.value));

export function normalizeJobStatus(value: string | null | undefined): JobStatus {
  return validJobStatuses.has(value as JobStatus) ? (value as JobStatus) : "RESEARCH_LEAD";
}

export function normalizeLookupValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findMatchingOption(options: Option[] | undefined, value: string | null | undefined) {
  const target = value?.trim();
  if (!target) return null;
  const normalizedTarget = normalizeLookupValue(target);
  return (
    options?.find((option) => {
      const normalizedOption = normalizeLookupValue(option.label);
      return (
        normalizedOption === normalizedTarget ||
        normalizedOption.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedOption)
      );
    }) ?? null
  );
}
