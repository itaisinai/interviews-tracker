import type { ReactNode } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MaterialIcon } from "./material-icon";

const nav = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/companies", label: "Companies", icon: "business" },
  { to: "/opportunities", label: "Opportunities", icon: "work" },
  { to: "/interactions", label: "Interactions", icon: "forum" },
  { to: "/tasks", label: "Tasks", icon: "assignment_turned_in" },
  { to: "/compensation", label: "Compensation", icon: "payments" },
  { to: "/parse", label: "Parse Job", icon: "auto_awesome" },
  { to: "/settings", label: "Settings", icon: "settings" }
];

const placeholders: Record<string, string> = {
  "/": "Search opportunities or tasks...",
  "/companies": "Search companies...",
  "/opportunities": "Search opportunities...",
  "/interactions": "Search interactions...",
  "/tasks": "Search tasks...",
  "/compensation": "Search offers...",
  "/parse": "Search parsed jobs...",
  "/settings": "Search options..."
};

export function AppShell() {
  const { logout, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const activeBase = `/${location.pathname.split("/")[1]}` === "/" ? "/" : `/${location.pathname.split("/")[1]}`;
  const displayName = user?.name ?? user?.email ?? "User";
  const initials = (user?.name ?? user?.email ?? "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const activeNavItem = nav.find((item) => item.to === activeBase) ?? nav[0];
  const mobileTitle = activeNavItem.to === "/" ? "CareerFlow" : activeNavItem.label;
  const mobileIcon = activeNavItem.to === "/" ? "rocket_launch" : activeNavItem.icon;
  const avatar = user?.picture ?? null;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-[260px] flex-col border-r border-outline-variant bg-background py-6 md:flex">
        <div className="mb-8 px-6">
          <h1 className="font-headline-md text-headline-md font-bold text-on-background">CareerFlow</h1>
          <p className="font-label-md text-label-md text-on-surface-variant">Senior Workspace</p>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-4 py-2 pl-4 pr-6 transition-colors hover:bg-surface-container-low ${
                  isActive ? "border-l-2 border-primary bg-surface-container-low font-bold text-primary" : "font-medium text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MaterialIcon name={item.icon} filled={isActive} />
                  <span className="font-body-md text-body-md">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-outline-variant px-6 pt-6">
          <button className="flex w-full items-center gap-4 rounded-lg py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
            <MaterialIcon name="person" />
            <span className="min-w-0 truncate font-body-md text-body-md">{user?.email ?? displayName}</span>
          </button>
          <button className="flex w-full items-center gap-4 rounded-lg py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low" onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}>
            <MaterialIcon name="logout" />
            <span className="font-body-md text-body-md">Logout</span>
          </button>
        </div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b border-outline-variant bg-background/90 backdrop-blur-md md:inset-x-auto md:left-[260px] md:right-0 md:z-40">
        <div className="flex w-full items-center justify-between px-4 md:mx-auto md:max-w-[1280px] md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
              <MaterialIcon name={mobileIcon} filled={activeBase === "/"} />
            </div>
            <span className="font-headline-md text-headline-md font-medium text-on-background">{mobileTitle}</span>
          </div>
          <div className="hidden w-full max-w-md items-center md:flex">
            <div className="relative w-full max-w-md">
              <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input className="w-full rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary/20" placeholder={placeholders[activeBase] ?? "Search..."} />
            </div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant">
              <MaterialIcon name="notifications" />
            </button>
            <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant">
              <MaterialIcon name="help_outline" />
            </button>
            <div className="hidden lg:block">
              <button className="btn btn-primary rounded-full" onClick={() => navigate("/opportunities/new")}>
                <MaterialIcon name="add" />
                Add Opportunity
              </button>
            </div>
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate font-label-md text-label-md text-on-background">{displayName}</p>
              <p className="max-w-40 truncate font-label-sm text-label-sm text-on-surface-variant">{user?.email ?? "Authenticated"}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-primary-container bg-on-primary-container font-geist text-sm font-bold text-white">
              {avatar ? <img alt={displayName} className="h-full w-full object-cover" src={avatar} /> : initials || "U"}
            </div>
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {nav.filter((item) => ["/", "/opportunities", "/interactions", "/tasks", "/settings"].includes(item.to)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-2 text-[10px] leading-none transition-colors ${
                  isActive ? "text-primary" : "text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MaterialIcon name={item.icon} filled={isActive} />
                  <span className="max-w-full truncate px-1 text-center font-label-sm text-[10px] leading-none">{item.label === "Parse Job" ? "Parse" : item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="min-h-screen pt-16 pb-24 md:ml-[260px] md:pb-8">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-4 md:px-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageIntro({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 hidden flex-col justify-between gap-6 md:flex md:items-end md:flex-row">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-background">{title}</h2>
        {description ? <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
