import { labelForInteractionType } from "../../lib/enum-labels";
import { formatDurationBetween } from "../../lib/format";
import type { Interaction } from "../../lib/types";
import type { CalendarEvent } from "../calendar";

export type InteractionFilter = "upcoming" | "done" | "followup" | "all";

export type InteractionOpportunityGroup = {
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  opportunityStatus: string;
  interactions: Interaction[];
  latestTimestamp: number;
  closestTimestamp: number;
};

export type InteractionCalendarEvent = CalendarEvent & {
  date: string;
  isFuture: boolean;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function buildOpportunityGroups(interactions: readonly Interaction[]) {
  const groups = new Map<string, InteractionOpportunityGroup>();
  const now = Date.now();

  for (const interaction of interactions) {
    // Use nested opportunity slug as the group key
    const opportunitySlug = interaction.jobOpportunity?.slug ?? "unknown";
    const existing = groups.get(opportunitySlug);
    const timestamp = new Date(interaction.date).getTime();

    if (!existing) {
      groups.set(opportunitySlug, {
        opportunitySlug: opportunitySlug,
        companyName: interaction.jobOpportunity?.company.name ?? "Unknown company",
        roleTitle: interaction.jobOpportunity?.roleTitle ?? "Unknown role",
        opportunityStatus: interaction.jobOpportunity?.status ?? "UNKNOWN",
        interactions: [interaction],
        latestTimestamp: timestamp,
        closestTimestamp: timestamp,
      });
      continue;
    }

    existing.interactions.push(interaction);
    existing.latestTimestamp = Math.max(existing.latestTimestamp, timestamp);
    existing.closestTimestamp = getClosestTimestamp(existing.closestTimestamp, timestamp, now);
  }

  return [...groups.values()].sort((left, right) => {
    const leftDistance = Math.abs(left.closestTimestamp - now);
    const rightDistance = Math.abs(right.closestTimestamp - now);

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance;
    }

    const leftIsFuture = left.closestTimestamp >= now;
    const rightIsFuture = right.closestTimestamp >= now;

    if (leftIsFuture !== rightIsFuture) {
      return leftIsFuture ? -1 : 1;
    }

    return (
      left.closestTimestamp - right.closestTimestamp ||
      left.companyName.localeCompare(right.companyName) ||
      left.roleTitle.localeCompare(right.roleTitle)
    );
  });
}

export function filterOpportunityGroup(group: InteractionOpportunityGroup, filter: InteractionFilter) {
  if (filter === "upcoming") {
    return group.interactions.some((item) => new Date(item.date) >= new Date());
  }

  if (filter === "done") {
    return group.interactions.some((item) => item.status === "DONE");
  }

  if (filter === "followup") {
    // Exclude rejected opportunities from "waiting for response" filter
    if (group.opportunityStatus === "REJECTED") {
      return false;
    }
    return group.interactions.some(
      (item) =>
        isLatestInteraction(item, group.interactions) &&
        (item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim()))
    );
  }

  return true;
}

export function countFollowUps(interactions: readonly Interaction[]) {
  return interactions.filter(
    (item) =>
      isLatestInteraction(item, interactions) && (item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim()))
  ).length;
}

export function countUpcoming(interactions: readonly Interaction[]) {
  return interactions.filter((item) => new Date(item.date) >= new Date()).length;
}

export function calculatePercent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function buildInteractionCalendarEvents(interactions: readonly Interaction[]): InteractionCalendarEvent[] {
  return interactions.map((interaction) => {
    try {
      const date = new Date(interaction.date);
      const isFuture = date.getTime() > Date.now();
      const duration = formatDurationBetween(interaction.date, interaction.endDate);

      // Build title parts: Company · Stage/Type · Duration (no brackets, use bullet separator)
      // MIGRATION FIX: Handle missing company data gracefully
      const companyName = interaction.jobOpportunity?.company?.name ?? "Unknown Company";
      const titleParts = [companyName, interaction.stage || labelForInteractionType(interaction.type), duration].filter(
        Boolean
      );

      return {
        id: interaction.slug ?? "unknown",
        date: interaction.date,
        title: titleParts.length > 0 ? titleParts.join(" · ") : labelForInteractionType(interaction.type),
        time: timeFormatter.format(date),
        isFuture,
      };
    } catch (error) {
      console.error("Error building calendar event for interaction:", interaction, error);
      // Return a safe fallback
      return {
        id: interaction.slug ?? "error",
        date: interaction.date,
        title: "Error loading interaction",
        time: new Date(interaction.date).toLocaleTimeString(),
        isFuture: new Date(interaction.date).getTime() > Date.now(),
      };
    }
  });
}

function isLatestInteraction(interaction: Interaction, interactions: readonly Interaction[]) {
  return !interactions.some((item) => {
    // Compare opportunity slugs
    const itemOpportunitySlug = item.jobOpportunity?.slug;
    const interactionOpportunitySlug = interaction.jobOpportunity?.slug;

    if (itemOpportunitySlug !== interactionOpportunitySlug) {
      return false;
    }

    const itemTime = new Date(item.date).getTime();
    const interactionTime = new Date(interaction.date).getTime();
    return (
      itemTime > interactionTime || (itemTime === interactionTime && item.slug.localeCompare(interaction.slug) > 0)
    );
  });
}

function getClosestTimestamp(current: number, next: number, now: number) {
  const currentDistance = Math.abs(current - now);
  const nextDistance = Math.abs(next - now);

  if (nextDistance < currentDistance) {
    return next;
  }

  if (nextDistance > currentDistance) {
    return current;
  }

  const currentIsFuture = current >= now;
  const nextIsFuture = next >= now;

  if (nextIsFuture && !currentIsFuture) {
    return next;
  }

  return current;
}
