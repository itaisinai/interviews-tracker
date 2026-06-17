import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { activeNotifications, buildUnlinkedInteractionNotifications, NOTIFICATIONS_STORAGE_KEY, syncNotifications, unreadNotificationsCount, type AppNotification } from "../../lib/notifications";
import { NotificationsContext, type NotificationsContextValue } from "./notifications-context";

function readStoredNotifications() {
  if (typeof window === "undefined") return [];
  try {
    const value = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    return value ? (JSON.parse(value) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function writeStoredNotifications(notifications: AppNotification[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(readStoredNotifications);
  const interactionsQuery = useQuery({
    queryKey: ["interactions", "notifications"],
    queryFn: api.interactions,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!interactionsQuery.data) return;
    setNotifications((current) => {
      const next = syncNotifications(
        current,
        buildUnlinkedInteractionNotifications(interactionsQuery.data),
      );
      writeStoredNotifications(next);
      return next;
    });
  }, [interactionsQuery.data]);

  const value = useMemo<NotificationsContextValue>(() => {
    const active = activeNotifications(notifications);
    return {
      notifications,
      active,
      unreadCount: unreadNotificationsCount(notifications),
      markAllAsRead: () =>
        setNotifications((current) => {
          const next = current.map((item) => item.status === "unread" ? { ...item, status: "read" as const, updatedAt: new Date().toISOString() } : item);
          writeStoredNotifications(next);
          return next;
        }),
      markAsRead: (key) =>
        setNotifications((current) => {
          const next = current.map((item) => item.key === key && item.status === "unread" ? { ...item, status: "read" as const, updatedAt: new Date().toISOString() } : item);
          writeStoredNotifications(next);
          return next;
        }),
    };
  }, [notifications]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
