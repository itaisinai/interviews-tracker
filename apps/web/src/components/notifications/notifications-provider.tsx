import { type ReactNode, useEffect, useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";

import { api } from "../../lib/api";
import {
  activeNotifications,
  type AppNotification,
  buildUnlinkedInteractionNotifications,
  fromPersistentNotification,
  NOTIFICATIONS_STORAGE_KEY,
  syncNotifications,
  unreadNotificationsCount,
} from "../../lib/notifications";

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
  const unreadQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: api.notificationUnreadCount,
    refetchInterval: 25_000,
    refetchOnWindowFocus: true,
  });
  const persistentQuery = useQuery({
    queryKey: ["notifications", "list"],
    queryFn: api.notifications,
    refetchOnWindowFocus: true,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!interactionsQuery.data) return;
    setNotifications((current) => {
      const next = syncNotifications(current, buildUnlinkedInteractionNotifications(interactionsQuery.data));
      writeStoredNotifications(next);
      return next;
    });
  }, [interactionsQuery.data]);

  useEffect(() => {
    if (!persistentQuery.data) return;
    setNotifications((current) => {
      const local = current.filter((item) => !item.key.startsWith("persistent:"));
      const next = syncNotifications(local, [
        ...buildUnlinkedInteractionNotifications(interactionsQuery.data ?? []),
        ...persistentQuery.data.map(fromPersistentNotification),
      ]);
      writeStoredNotifications(next);
      return next;
    });
  }, [interactionsQuery.data, persistentQuery.data]);

  useEffect(() => {
    if (unreadQuery.data && unreadQuery.data.count > unreadNotificationsCount(notifications)) {
      void persistentQuery.refetch();
    }
  }, [notifications, persistentQuery, unreadQuery.data]);

  const value = useMemo<NotificationsContextValue>(() => {
    const active = activeNotifications(notifications);
    return {
      notifications,
      active,
      unreadCount: unreadNotificationsCount(notifications),
      refetchNotifications: () => {
        void Promise.all([persistentQuery.refetch(), unreadQuery.refetch()]);
      },
      markAllAsRead: () => {
        void api.markAllNotificationsRead().then(() => unreadQuery.refetch());
        setNotifications((current) => {
          const next = current.map((item) =>
            item.status === "unread" ? { ...item, status: "read" as const, updatedAt: new Date().toISOString() } : item
          );
          writeStoredNotifications(next);
          return next;
        });
      },
      markAsRead: (key) => {
        if (key.startsWith("persistent:")) {
          void api.markNotificationRead(key.slice("persistent:".length)).then(() => unreadQuery.refetch());
        }
        setNotifications((current) => {
          const next = current.map((item) =>
            item.key === key && item.status === "unread"
              ? { ...item, status: "read" as const, updatedAt: new Date().toISOString() }
              : item
          );
          writeStoredNotifications(next);
          return next;
        });
      },
    };
  }, [notifications, persistentQuery, unreadQuery]);

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}
