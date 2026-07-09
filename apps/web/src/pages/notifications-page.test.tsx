import * as React from "react";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import assert from "node:assert/strict";
import test from "node:test";

import {
  NotificationsContext,
  type NotificationsContextValue,
} from "../components/notifications/notifications-context.js";
import type { AppNotification } from "../lib/notifications.js";

import { filterNotifications, NotificationsPage } from "./notifications-page.js";

const notification: AppNotification = {
  id: "unlinked-interactions:alta",
  key: "unlinked-interactions:alta",
  type: "unlinked_interactions",
  opportunityId: "alta",
  opportunityName: "Alta",
  count: 1,
  title: "Alta has 1 interaction not linked to emails",
  message: "Update interactions to keep your timeline in sync",
  status: "unread",
  createdAt: "2026-06-15T12:00:00.000Z",
  updatedAt: "2026-06-15T12:00:00.000Z",
};

const readNotification: AppNotification = {
  ...notification,
  id: "unlinked-interactions:reevol",
  key: "unlinked-interactions:reevol",
  opportunityId: "reevol",
  opportunityName: "Reevol",
  title: "Reevol has 2 interactions not linked to emails",
  status: "read",
};

test("notifications page renders filters, mark all as read, and list", () => {
  const context: NotificationsContextValue = {
    notifications: [notification],
    active: [notification],
    unreadCount: 1,
    markAllAsRead: () => undefined,
    markAsRead: () => undefined,
  };
  const html = renderToString(
    <MemoryRouter>
      <NotificationsContext.Provider value={context}>
        <NotificationsPage />
      </NotificationsContext.Provider>
    </MemoryRouter>
  );
  assert.match(html, /Stay on top of what needs your attention\./);
  assert.match(html, /Unread/);
  assert.match(html, /Interactions/);
  assert.match(html, /Mark all as read/);
  assert.match(html, /Alta has 1 interaction not linked to emails/);
  assert.match(html, /No more notifications/);
});

test("notification page filters update the displayed collection", () => {
  const notifications = [notification, readNotification];
  assert.deepEqual(
    filterNotifications(notifications, "Unread").map((item) => item.key),
    ["unlinked-interactions:alta"]
  );
  assert.deepEqual(
    filterNotifications(notifications, "Interactions").map((item) => item.key),
    ["unlinked-interactions:alta", "unlinked-interactions:reevol"]
  );
  assert.equal(filterNotifications(notifications, "Opportunities").length, 0);
  assert.equal(filterNotifications(notifications, "System").length, 0);
});
