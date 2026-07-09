import { createContext, useContext } from "react";

import type { AppNotification } from "../../lib/notifications";

export type NotificationsContextValue = {
  notifications: AppNotification[];
  active: AppNotification[];
  unreadCount: number;
  markAllAsRead: () => void;
  markAsRead: (key: string) => void;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error("useNotifications must be used within NotificationsProvider");
  return context;
}
