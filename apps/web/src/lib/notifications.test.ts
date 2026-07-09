import assert from "node:assert/strict";
import test from "node:test";

import {
  activeNotifications,
  buildUnlinkedInteractionNotifications,
  syncNotifications,
  unreadNotificationsCount,
} from "./notifications.js";

const now = new Date("2026-06-15T12:00:00.000Z");
const later = new Date("2026-06-15T12:05:00.000Z");
const base: any[] = [
  {
    slug: "i1",
    jobOpportunityId: "reevol",
    gmailMessageId: null,
    jobOpportunity: { company: { id: "c1", slug: "reevol", name: "Reevol" } },
  },
  {
    slug: "i2",
    jobOpportunityId: "reevol",
    gmailMessageId: undefined,
    jobOpportunity: { company: { id: "c1", slug: "reevol", name: "Reevol" } },
  },
  {
    slug: "i3",
    jobOpportunityId: "alta",
    gmailMessageId: "gmail-1",
    jobOpportunity: { company: { id: "c2", slug: "alta", name: "Alta" } },
  },
  {
    slug: "i4",
    jobOpportunityId: "token",
    gmailMessageId: null,
    jobOpportunity: { company: { id: "c3", slug: "token", name: "Token Security" } },
  },
];

test("detects unlinked interactions and groups notifications by opportunity", () => {
  const notifications = buildUnlinkedInteractionNotifications(base, now);
  assert.equal(notifications.length, 2);
  assert.equal(notifications.find((item) => item.opportunityId === "reevol")?.count, 2);
  assert.equal(
    notifications.find((item) => item.opportunityId === "token")?.title,
    "Token Security has 1 interaction not linked to emails"
  );
});

test("avoids duplicate notifications when synced repeatedly", () => {
  const generated = buildUnlinkedInteractionNotifications(base, now);
  const once = syncNotifications([], generated, now);
  const twice = syncNotifications(once, generated, later);
  assert.equal(twice.filter((item) => item.key === "unlinked-interactions:reevol").length, 1);
  assert.equal(twice.find((item) => item.opportunityId === "reevol")?.createdAt, now.toISOString());
});

test("updates count when unlinked interactions count changes", () => {
  const existing = syncNotifications([], buildUnlinkedInteractionNotifications(base, now), now);
  const changed = buildUnlinkedInteractionNotifications(base.slice(0, 1), later);
  const synced = syncNotifications(existing, changed, later);
  const reevol = synced.find((item) => item.opportunityId === "reevol");
  assert.equal(reevol?.count, 1);
  assert.equal(reevol?.status, "unread");
});

test("resolves notification when all interactions are linked", () => {
  const existing = syncNotifications([], buildUnlinkedInteractionNotifications(base, now), now);
  const synced = syncNotifications(existing, [], later);
  assert.equal(activeNotifications(synced).length, 0);
  assert.equal(
    synced.every((item) => item.status === "resolved"),
    true
  );
});

test("counts unread active notifications for the bell badge", () => {
  const notifications = syncNotifications([], buildUnlinkedInteractionNotifications(base, now), now);
  assert.equal(unreadNotificationsCount(notifications), 2);
});
