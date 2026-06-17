import type { ReactNode } from "react";
import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { MaterialIcon } from "@interviews-tracker/design-system";
import { NotificationsBell } from "../notifications";
import { GlobalSearchBox } from "./global-search-box";

const nav = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/companies", label: "Companies", icon: "business" },
  { to: "/opportunities", label: "Opportunities", icon: "work" },
  { to: "/interactions", label: "Interactions", icon: "forum" },
  { to: "/search", label: "Search", icon: "search" },
  { to: "/tasks", label: "Tasks", icon: "assignment_turned_in" },
  { to: "/compensation", label: "Compensation", icon: "payments" },
  { to: "/settings", label: "Settings", icon: "settings" }
];

const placeholders: Record<string, string> = {
  "/": "Search opportunities or tasks...",
  "/companies": "Search companies...",
  "/opportunities": "Search opportunities...",
  "/interactions": "Search interactions...",
  "/search": "Search companies, opportunities, interactions...",
  "/tasks": "Search tasks...",
  "/compensation": "Search offers...",
  "/parse": "Search parsed jobs...",
  "/settings": "Search options..."
};

export function AppShell() {
  const { logout, user } = useAuth0();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const activeBase =
    `/${location.pathname.split("/")[1]}` === "/"
      ? "/"
      : `/${location.pathname.split("/")[1]}`;
  const displayName = user?.name ?? user?.email ?? "User";
  const initials = (user?.name ?? user?.email ?? "U")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  const activeNavItem = nav.find((item) => item.to === activeBase) ?? nav[0];
  const mobileTitle =
    activeBase === "/parse"
      ? "Parse Job"
      : activeNavItem.to === "/"
        ? "CareerFlow"
        : activeNavItem.label;
  const mobileIcon =
    activeBase === "/parse"
      ? "auto_awesome"
      : activeNavItem.to === "/"
        ? "rocket_launch"
        : activeNavItem.icon;
  const avatar = user?.picture ?? null;
  const sidebarWidth = sidebarCollapsed ? 72 : 260;

  // Apply sidebar offset only on desktop (md breakpoint and up)
  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' && window.innerWidth >= 768);

  React.useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <aside
        className="fixed left-0 z-50 hidden flex-col border-r border-outline-variant bg-[#d7e8f4] transition-all duration-300 md:flex"
        style={{
          top: "var(--dev-banner-height, 0)",
          height: "calc(100vh - var(--dev-banner-height, 0))",
          width: `${sidebarWidth}px`
        }}
      >
        <div className="flex h-16 items-center justify-between border-b border-outline-variant px-4">
          {!sidebarCollapsed && (
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-on-background">
                CareerFlow
              </h1>
              <p className="font-label-md text-label-md text-on-surface-variant">
                Senior Workspace
              </p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container-low ${sidebarCollapsed ? 'mx-auto' : ''}`}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <MaterialIcon name={sidebarCollapsed ? "menu" : "menu_open"} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto py-2">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              title={sidebarCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-4 py-2 transition-colors hover:bg-surface-container-low/80 ${
                  sidebarCollapsed ? 'justify-center px-4' : 'pl-4 pr-6'
                } ${
                  isActive
                    ? "border-l-2 border-primary bg-surface-container-lowest font-bold text-primary"
                    : "font-medium text-on-surface-variant"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <MaterialIcon name={item.icon} filled={isActive} />
                  {!sidebarCollapsed && (
                    <span className="font-body-md text-body-md">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={`mt-auto space-y-1 border-t border-outline-variant pt-4 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
          <button
            className={`flex w-full items-center gap-4 rounded-lg py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low/80 ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? user?.email ?? displayName : undefined}
          >
            <MaterialIcon name="person" />
            {!sidebarCollapsed && (
              <span className="min-w-0 truncate font-body-md text-body-md">
                {user?.email ?? displayName}
              </span>
            )}
          </button>
          <button
            className={`flex w-full items-center gap-4 rounded-lg py-2 text-on-surface-variant transition-colors hover:bg-surface-container-low/80 ${sidebarCollapsed ? 'justify-center' : ''}`}
            onClick={() =>
              void logout({ logoutParams: { returnTo: window.location.origin } })
            }
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <MaterialIcon name="logout" />
            {!sidebarCollapsed && (
              <span className="font-body-md text-body-md">Logout</span>
            )}
          </button>
        </div>
      </aside>
      <header
        className="fixed inset-x-0 z-50 flex h-16 items-center border-b border-outline-variant bg-background/80 backdrop-blur-sm transition-[left] duration-300 md:z-40"
        style={{
          top: "var(--dev-banner-height, 0)",
          left: isDesktop ? `${sidebarWidth}px` : '0'
        }}
      >
          <div className="flex w-full items-center justify-between px-4 md:mx-auto md:max-w-[1280px] md:px-6">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-on-primary">
              <MaterialIcon name={mobileIcon} filled={activeBase === "/"} />
            </div>
            <span className="font-headline-md text-headline-md font-medium text-on-background">
              {mobileTitle}
            </span>
          </div>
          <div className="hidden w-full max-w-md items-center md:flex">
            <GlobalSearchBox placeholder={placeholders[activeBase] ?? "Search..."} />
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <NotificationsBell />
            <button className="rounded-full p-2 text-on-surface-variant transition-all hover:bg-surface-variant">
              <MaterialIcon name="help_outline" />
            </button>
            <div className="hidden lg:block">
              <button
                className="btn btn-primary rounded-full shadow-sm"
                onClick={() => navigate("/opportunities/new")}
              >
                <MaterialIcon name="add" />
                Add Opportunity
              </button>
            </div>
            <div className="hidden text-right sm:block">
              <p className="max-w-40 truncate font-label-md text-label-md text-on-background">
                {displayName}
              </p>
              <p className="max-w-40 truncate font-label-sm text-label-sm text-on-surface-variant">
                {user?.email ?? "Authenticated"}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-primary-container bg-on-primary-container font-geist text-sm font-bold text-white">
              {avatar ? (
                <img alt={displayName} className="h-full w-full object-cover" src={avatar} />
              ) : (
                initials || "U"
              )}
            </div>
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-outline-variant bg-background/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-5">
          {nav
            .filter((item) =>
              ["/", "/opportunities", "/interactions", "/search", "/settings"].includes(
                item.to,
              ),
            )
            .map((item) => (
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
                    <span className="max-w-full truncate px-1 text-center font-label-sm text-[10px] leading-none">
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
        </div>
      </nav>
      <main
        className="min-h-screen pb-24 transition-[margin-left] duration-300 md:pb-8 md:overflow-x-hidden"
        style={{
          paddingTop: "calc(4rem + var(--dev-banner-height, 0))",
          marginLeft: isDesktop ? `${sidebarWidth}px` : '0'
        }}
      >
        <div className="mx-auto w-full max-w-[1280px] px-4 py-4 md:px-6 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function PageIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 hidden flex-col justify-between gap-6 md:flex md:flex-row md:items-end">
      <div>
        <h2 className="font-headline-lg text-headline-lg text-on-background">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 font-body-lg text-body-lg text-on-surface-variant">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
