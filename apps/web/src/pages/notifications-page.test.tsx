import * as React from "react";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { NotificationsContext, type NotificationsContextValue } from "../components/notifications/notifications-context.js";
import type { AppNotification } from "../lib/notifications.js";
import { NotificationsPage } from "./notifications-page.js";

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
    </MemoryRouter>,
  );
  assert.match(html, /Stay on top of what needs your attention\./);
  assert.match(html, /Unread/);
  assert.match(html, /Interactions/);
  assert.match(html, /Mark all as read/);
  assert.match(html, /Alta has 1 interaction not linked to emails/);
  assert.match(html, /No more notifications/);
});
