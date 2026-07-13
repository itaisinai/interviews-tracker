import { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { QueryClientProvider } from "@tanstack/react-query";

import { PageLoadingState } from "@interviews-tracker/design-system";

import { AppLayout } from "./components/app-layout";
import { AuthGate } from "./components/auth-gate";
import { NotificationsProvider } from "./components/notifications";
import { queryClient } from "./lib/query-client";

import "@interviews-tracker/design-system/styles/tokens.css";
import "./styles.css";

// Initialize dev-banner-height to 0 by default
document.documentElement.style.setProperty("--dev-banner-height", "0px");

const DashboardPage = lazy(() =>
  import("./pages/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  }))
);
const OpportunitiesPage = lazy(() =>
  import("./pages/opportunities-page").then((module) => ({
    default: module.OpportunitiesPage,
  }))
);
const CompaniesPage = lazy(() =>
  import("./pages/companies-page").then((module) => ({
    default: module.CompaniesPage,
  }))
);
const CompanyDetailPage = lazy(() =>
  import("./pages/company-detail-page").then((module) => ({
    default: module.CompanyDetailPage,
  }))
);
const OpportunityDetailPage = lazy(() =>
  import("./pages/opportunity-detail-page").then((module) => ({
    default: module.OpportunityDetailPage,
  }))
);
const OpportunityFormPage = lazy(() =>
  import("./pages/opportunity-form-page").then((module) => ({
    default: module.OpportunityFormPage,
  }))
);
const InteractionsPage = lazy(() =>
  import("./pages/interactions-page").then((module) => ({
    default: module.InteractionsPage,
  }))
);
const SettingsPage = lazy(() =>
  import("./pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  }))
);
const NotificationsPage = lazy(() =>
  import("./pages/notifications-page").then((module) => ({
    default: module.NotificationsPage,
  }))
);
const SearchPage = lazy(() =>
  import("./pages/search-page").then((module) => ({
    default: module.SearchPage,
  }))
);

function App() {
  return (
    <AuthGate>
      <QueryClientProvider client={queryClient}>
        <NotificationsProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<PageLoadingState title="Loading" description="Loading page..." />}>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/companies" element={<CompaniesPage />} />
                  <Route path="/companies/:companySlugOrId" element={<CompanyDetailPage />} />
                  <Route path="/opportunities" element={<OpportunitiesPage />} />
                  <Route path="/opportunities/new" element={<OpportunityFormPage />} />
                  <Route path="/opportunities/:slug" element={<OpportunityDetailPage />} />
                  <Route path="/opportunities/:slug/edit" element={<Navigate to="/opportunities/:slug" replace />} />
                  <Route path="/interactions" element={<InteractionsPage />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationsProvider>
      </QueryClientProvider>
    </AuthGate>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
