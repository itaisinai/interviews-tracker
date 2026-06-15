import { MaterialIcon } from "@interviews-tracker/design-system";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../components/notifications/notifications-context";
import { NotificationRow } from "../components/notifications/notifications-ui";

const filters = ["All", "Unread", "Interactions", "Opportunities", "System"];

export function NotificationsPage() {
  const { active, markAllAsRead, markAsRead } = useNotifications();
  const navigate = useNavigate();

  return (
    <section>
      <div className="mb-6 flex flex-col gap-5 md:mb-7">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-background">Notifications</h2>
          <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">Stay on top of what needs your attention.</p>
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button key={filter} className={`rounded-full border px-4 py-2 font-label-md text-label-md transition-colors ${filter === "All" ? "border-primary-container bg-primary-container text-primary" : "border-outline-variant bg-background text-on-surface-variant hover:border-primary/40 hover:text-primary"}`}>
                {filter}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 self-start rounded-full px-3 py-2 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary" onClick={markAllAsRead}>
            <MaterialIcon name="check_circle" />
            Mark all as read
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-outline-variant bg-background shadow-sm">
        {active.length ? (
          <div className="divide-y divide-outline-variant">
            {active.map((notification) => (
              <NotificationRow
                key={notification.key}
                notification={notification}
                onClick={() => {
                  markAsRead(notification.key);
                  navigate(`/opportunities/${notification.opportunityId}`);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center font-body-md text-body-md text-on-surface-variant">No more notifications</div>
        )}
      </div>
      {active.length ? (
        <p className="mt-8 flex items-center justify-center gap-2 text-body-md text-on-surface-variant">No more notifications <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-container-low text-primary"><MaterialIcon name="check" className="text-[18px]" /></span></p>
      ) : null}
    </section>
  );
}
