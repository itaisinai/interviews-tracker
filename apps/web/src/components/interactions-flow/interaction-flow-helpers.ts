import type { CalendarEvent } from "../calendar";
import { labelForInteractionType } from "../../lib/enum-labels";
import type { Interaction } from "../../lib/types";

export type InteractionFilter = "upcoming" | "done" | "followup" | "all";

export type InteractionOpportunityGroup = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  interactions: Interaction[];
  latestTimestamp: number;
};

export type InteractionCalendarEvent = CalendarEvent & {
  date: string;
};

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export function buildOpportunityGroups(interactions: readonly Interaction[]) {
  const groups = new Map<string, InteractionOpportunityGroup>();

  for (const interaction of interactions) {
    const existing = groups.get(interaction.jobOpportunityId);
    const timestamp = new Date(interaction.date).getTime();

    if (!existing) {
      groups.set(interaction.jobOpportunityId, {
        opportunityId: interaction.jobOpportunityId,
        companyName:
          interaction.jobOpportunity?.companyName ?? "Unknown company",
        roleTitle: interaction.jobOpportunity?.roleTitle ?? "Unknown role",
        interactions: [interaction],
        latestTimestamp: timestamp,
      });
      continue;
    }

    existing.interactions.push(interaction);
    existing.latestTimestamp = Math.max(existing.latestTimestamp, timestamp);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.latestTimestamp !== right.latestTimestamp) {
      return right.latestTimestamp - left.latestTimestamp;
    }

    return (
      left.companyName.localeCompare(right.companyName) ||
      left.roleTitle.localeCompare(right.roleTitle)
    );
  });
}

export function filterOpportunityGroup(
  group: InteractionOpportunityGroup,
  filter: InteractionFilter,
) {
  if (filter === "upcoming") {
    return group.interactions.some((item) => new Date(item.date) >= new Date());
  }

  if (filter === "done") {
    return group.interactions.some((item) => item.status === "DONE");
  }

  if (filter === "followup") {
    return group.interactions.some(
      (item) =>
        isLatestInteraction(item, group.interactions) &&
        (item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim())),
    );
  }

  return true;
}

export function countFollowUps(interactions: readonly Interaction[]) {
  return interactions.filter(
    (item) =>
      isLatestInteraction(item, interactions) &&
      (item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim())),
  ).length;
}

export function countUpcoming(interactions: readonly Interaction[]) {
  return interactions.filter((item) => new Date(item.date) >= new Date())
    .length;
}

export function calculatePercent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function buildInteractionCalendarEvents(
  interactions: readonly Interaction[],
): InteractionCalendarEvent[] {
  return interactions.map((interaction) => {
    const date = new Date(interaction.date);
    const titleParts = [
      interaction.jobOpportunity?.companyName,
      interaction.stage || labelForInteractionType(interaction.type),
      interaction.personName,
    ].filter(Boolean);

    return {
      id: interaction.id,
      date: interaction.date,
      title:
        titleParts.length > 0
          ? titleParts.join(" · ")
          : labelForInteractionType(interaction.type),
      time: timeFormatter.format(date),
    };
  });
}

function isLatestInteraction(
  interaction: Interaction,
  interactions: readonly Interaction[],
) {
  return !interactions.some((item) => {
    if (item.jobOpportunityId !== interaction.jobOpportunityId) {
      return false;
    }

    const itemTime = new Date(item.date).getTime();
    const interactionTime = new Date(interaction.date).getTime();
    return (
      itemTime > interactionTime ||
      (itemTime === interactionTime && item.id.localeCompare(interaction.id) > 0)
    );
  });
}
