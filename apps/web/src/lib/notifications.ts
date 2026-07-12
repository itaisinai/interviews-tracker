import type { Interaction, Opportunity } from "./types";

export type NotificationType = "unlinked_interactions";
export type NotificationStatus = "unread" | "read" | "resolved";

export type AppNotification = {
  id: string;
  key: string;
  type: NotificationType;
  opportunitySlug: string;
  opportunityName: string;
  count: number;
  title: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  updatedAt: string;
};

export const NOTIFICATIONS_STORAGE_KEY = "careerflow.notifications";
export const UNLINKED_INTERACTIONS_MESSAGE = "Update interactions to keep your timeline in sync";

export type InteractionNotificationSource = Pick<Interaction, "slug" | "jobOpportunityId" | "gmailMessageId"> & {
  jobOpportunity?: Pick<Opportunity, "company"> | null;
};

export function getNotificationKey(opportunitySlug: string) {
  return `unlinked-interactions:${opportunitySlug}`;
}

function titleFor(opportunityName: string, count: number) {
  return `${opportunityName} has ${count} ${count === 1 ? "interaction" : "interactions"} not linked to emails`;
}

export function buildUnlinkedInteractionNotifications(
  interactions: readonly InteractionNotificationSource[],
  now = new Date()
): AppNotification[] {
  const grouped = new Map<string, { name: string; count: number }>();

  for (const interaction of interactions) {
    if (interaction.gmailMessageId) continue;
    const opportunitySlug = interaction.jobOpportunityId;
    if (!opportunitySlug) continue;
    const opportunityName = interaction.jobOpportunity?.company?.name?.trim() || "Opportunity";
    const current = grouped.get(opportunitySlug) ?? { name: opportunityName, count: 0 };
    current.count += 1;
    if (opportunityName !== "Opportunity") current.name = opportunityName;
    grouped.set(opportunitySlug, current);
  }

  const timestamp = now.toISOString();
  return [...grouped.entries()].map(([opportunitySlug, group]) => ({
    id: getNotificationKey(opportunitySlug),
    key: getNotificationKey(opportunitySlug),
    type: "unlinked_interactions" as const,
    opportunitySlug,
    opportunityName: group.name,
    count: group.count,
    title: titleFor(group.name, group.count),
    message: UNLINKED_INTERACTIONS_MESSAGE,
    status: "unread" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function buildUnlinkedInteractionNotificationsFromOpportunities(
  opportunities: readonly Pick<Opportunity, "slug" | "company" | "interactions">[],
  now = new Date()
): AppNotification[] {
  const interactions = opportunities.flatMap((opportunity) =>
    opportunity.interactions.map((interaction) => ({
      ...interaction,
      jobOpportunityId: interaction.jobOpportunityId || opportunity.slug,
      jobOpportunity: interaction.jobOpportunity ?? (opportunity as Opportunity),
    }))
  );
  return buildUnlinkedInteractionNotifications(interactions, now);
}

export function syncNotifications(
  existing: readonly AppNotification[],
  generated: readonly AppNotification[],
  now = new Date()
): AppNotification[] {
  const timestamp = now.toISOString();
  const generatedByKey = new Map(generated.map((item) => [item.key, item]));
  const existingByKey = new Map(existing.map((item) => [item.key, item]));
  const next: AppNotification[] = [];

  for (const generatedItem of generated) {
    const current = existingByKey.get(generatedItem.key);
    if (!current) {
      next.push(generatedItem);
      continue;
    }
    const changed =
      current.count !== generatedItem.count ||
      current.opportunityName !== generatedItem.opportunityName ||
      current.status === "resolved";
    next.push({
      ...current,
      ...generatedItem,
      status: current.status === "resolved" || changed ? "unread" : current.status,
      createdAt: current.createdAt,
      updatedAt: changed ? timestamp : current.updatedAt,
    });
  }

  for (const current of existing) {
    if (current.type === "unlinked_interactions" && !generatedByKey.has(current.key)) {
      next.push({ ...current, status: "resolved", updatedAt: timestamp });
    } else if (current.type !== "unlinked_interactions") {
      next.push(current);
    }
  }

  return next.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function activeNotifications(notifications: readonly AppNotification[]) {
  return notifications.filter((item) => item.status !== "resolved");
}

export function unreadNotificationsCount(notifications: readonly AppNotification[]) {
  return activeNotifications(notifications).filter((item) => item.status === "unread").length;
}
