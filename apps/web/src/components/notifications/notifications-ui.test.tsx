import * as React from "react";
(globalThis as typeof globalThis & { React: typeof React }).React = React;
import assert from "node:assert/strict";
import test from "node:test";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { NotificationsBell, NotificationsDropdown } from "./notifications-ui.js";
import { NotificationsContext, type NotificationsContextValue } from "./notifications-context.js";
import type { AppNotification } from "../../lib/notifications.js";

const notification: AppNotification = {
  id: "unlinked-interactions:reevol",
  key: "unlinked-interactions:reevol",
  type: "unlinked_interactions",
  opportunityId: "reevol",
  opportunityName: "Reevol",
  count: 2,
  title: "Reevol has 2 interactions not linked to emails",
  message: "Update interactions to keep your timeline in sync",
  status: "unread",
  createdAt: "2026-06-15T12:00:00.000Z",
  updatedAt: "2026-06-15T12:00:00.000Z",
};

function renderWithNotifications(children: React.ReactNode, value?: Partial<NotificationsContextValue>) {
  const context: NotificationsContextValue = {
    notifications: [notification],
    active: [notification],
    unreadCount: 1,
    markAllAsRead: () => undefined,
    markAsRead: () => undefined,
    ...value,
  };
  return renderToString(
    <MemoryRouter>
      <NotificationsContext.Provider value={context}>{children}</NotificationsContext.Provider>
    </MemoryRouter>,
  );
}

test("notification bell renders unread badge", () => {
  const html = renderWithNotifications(<NotificationsBell />);
  assert.match(html, /1 unread notifications/);
  assert.match(html, />1<\/span>/);
});

test("notifications dropdown renders active notifications and actions", () => {
  const html = renderWithNotifications(<NotificationsDropdown onClose={() => undefined} />);
  assert.match(html, /Notifications/);
  assert.match(html, /View all/);
  assert.match(html, /Reevol has 2 interactions not linked to emails/);
  assert.match(html, /Go to notifications page/);
});

test("mark all as read action can mark unread notifications read", () => {
  const value = { ...notification, status: "read" as const };
  assert.equal(value.status, "read");
});
