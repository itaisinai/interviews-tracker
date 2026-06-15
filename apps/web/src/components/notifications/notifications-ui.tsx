import { useState } from "react";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { Link, useNavigate } from "react-router-dom";
import type { AppNotification } from "../../lib/notifications";
import { useNotifications } from "./notifications-context";

export function formatRelativeTime(value: string, now = new Date()) {
  const diff = Math.max(0, now.getTime() - Date.parse(value));
  const minutes = Math.max(1, Math.floor(diff / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationWarningIcon() {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white"><MaterialIcon name="priority_high" className="text-[18px]" /></span>;
}

export function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { active, markAsRead } = useNotifications();
  const navigate = useNavigate();
  const latest = active.slice(0, 4);
  const goAll = () => { onClose(); navigate("/notifications"); };
  return (
    <div className="absolute right-0 top-12 z-50 w-[min(92vw,500px)] overflow-hidden rounded-lg border border-outline-variant bg-background shadow-xl" role="dialog" aria-label="Notifications dropdown">
      <div className="flex items-center justify-between border-b border-outline-variant px-5 py-4">
        <h3 className="font-title-md text-title-md font-bold">Notifications</h3>
        <button className="text-body-sm text-on-surface-variant hover:text-primary" onClick={goAll}>View all</button>
      </div>
      <div className="divide-y divide-outline-variant/70">
        {latest.length ? latest.map((item) => (
          <button key={item.key} className="flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-container-low" onClick={() => markAsRead(item.key)}>
            <NotificationWarningIcon />
            <span className="min-w-0 flex-1"><span className="block font-label-md text-label-md font-bold text-on-background">{item.title}</span><span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">{item.message}</span></span>
            <span className="shrink-0 font-label-sm text-label-sm text-on-surface-variant">{formatRelativeTime(item.updatedAt)}</span>
          </button>
        )) : <p className="px-5 py-8 text-center text-body-md text-on-surface-variant">No more notifications</p>}
      </div>
      <button className="w-full border-t border-outline-variant px-5 py-4 text-left font-body-md text-body-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary" onClick={goAll}>Go to notifications page</button>
    </div>
  );
}

export function NotificationRow({ notification, onClick }: { notification: AppNotification; onClick: () => void }) {
  return (
    <button className="flex w-full items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-surface-container-low md:px-5" onClick={onClick}>
      <NotificationWarningIcon />
      <span className="min-w-0 flex-1"><span className="block font-label-md text-label-md font-bold text-on-background">{notification.title}</span><span className="mt-1 block font-body-sm text-body-sm text-on-surface-variant">{notification.message}</span></span>
      <span className="hidden font-label-sm text-label-sm text-on-surface-variant sm:block">{formatRelativeTime(notification.updatedAt)}</span>
      {notification.status === "unread" ? <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-label="Unread" /> : <span className="h-2.5 w-2.5" />}
      <MaterialIcon name="chevron_right" className="text-on-surface-variant" />
    </button>
  );
}

export function NotificationsBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        aria-label="Open notifications"
        className={`relative rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant ${open ? "bg-surface-container-lowest shadow-sm" : ""}`}
        onClick={() => setOpen((value) => !value)}
      >
        <MaterialIcon name="notifications" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 font-label-sm text-[11px] font-bold text-on-primary" aria-label={`${unreadCount} unread notifications`}>
            {unreadCount}
          </span>
        ) : null}
      </button>
      {open ? <NotificationsDropdown onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

export function NotificationPageLink() {
  return <Link to="/notifications">Notifications</Link>;
}
