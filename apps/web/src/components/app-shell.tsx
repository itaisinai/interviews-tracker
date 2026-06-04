import type { ReactNode } from "react";
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
  { to: "/import", label: "Import", icon: "upload_file" },
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
  "/import": "Search data...",
  "/settings": "Search options..."
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeBase = `/${location.pathname.split("/")[1]}` === "/" ? "/" : `/${location.pathname.split("/")[1]}`;

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-outline-variant bg-background py-6">
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
            <span className="font-body-md text-body-md">Profile</span>
          </button>
          <button className="flex w-full items-center gap-4 rounded-lg py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low">
            <MaterialIcon name="logout" />
            <span className="font-body-md text-body-md">Logout</span>
          </button>
        </div>
      </aside>
      <header className="fixed right-0 top-0 z-40 h-16 w-[calc(100%-260px)] border-b border-outline-variant bg-background">
        <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between px-6">
          <div className="relative w-full max-w-md">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input className="w-full rounded-full border-none bg-surface-container-low py-2 pl-10 pr-4 text-body-md focus:ring-2 focus:ring-primary/20" placeholder={placeholders[activeBase] ?? "Search..."} />
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant">
              <MaterialIcon name="notifications" />
            </button>
            <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant">
              <MaterialIcon name="help_outline" />
            </button>
            <button className="btn btn-primary rounded-full" onClick={() => navigate("/opportunities/new")}>
              <MaterialIcon name="add" />
              Add Opportunity
            </button>
            <div className="hidden text-right sm:block">
              <p className="font-label-md text-label-md text-on-background">Itai</p>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Senior Engineer</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary-container bg-on-primary-container font-geist text-sm font-bold text-white">I</div>
          </div>
        </div>
      </header>
      <main className="ml-[260px] min-h-screen pt-16">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageIntro({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-background">{title}</h2>
        {description ? <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
