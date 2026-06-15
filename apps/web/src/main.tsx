import { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/auth-gate";
import { AppShell } from "./components/app-shell";
import { PageLoadingState } from "@interviews-tracker/design-system";
import { queryClient } from "./lib/query-client";
import "@interviews-tracker/design-system/styles/tokens.css";
import "./styles.css";

const DashboardPage = lazy(() =>
  import("./pages/dashboard-page").then((module) => ({
    default: module.DashboardPage,
  })),
);
const OpportunitiesPage = lazy(() =>
  import("./pages/opportunities-page").then((module) => ({
    default: module.OpportunitiesPage,
  })),
);
const CompaniesPage = lazy(() =>
  import("./pages/companies-page").then((module) => ({
    default: module.CompaniesPage,
  })),
);
const CompanyDetailPage = lazy(() =>
  import("./pages/company-detail-page").then((module) => ({
    default: module.CompanyDetailPage,
  })),
);
const OpportunityDetailPage = lazy(() =>
  import("./pages/opportunity-detail-page").then((module) => ({
    default: module.OpportunityDetailPage,
  })),
);
const OpportunityFormPage = lazy(() =>
  import("./pages/opportunity-form-page").then((module) => ({
    default: module.OpportunityFormPage,
  })),
);
const InteractionsPage = lazy(() =>
  import("./pages/interactions-page").then((module) => ({
    default: module.InteractionsPage,
  })),
);
const TasksPage = lazy(() =>
  import("./pages/tasks-page").then((module) => ({ default: module.TasksPage })),
);
const CompensationPage = lazy(() =>
  import("./pages/compensation-page").then((module) => ({
    default: module.CompensationPage,
  })),
);
const SettingsPage = lazy(() =>
  import("./pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
);
const ParseJobPage = lazy(() =>
  import("./pages/parse-job-page").then((module) => ({
    default: module.ParseJobPage,
  })),
);

function App() {
  return (
    <AuthGate>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Suspense fallback={<PageLoadingState title="Loading" description="Loading page..." />}>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/companies/:companyName" element={<CompanyDetailPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/opportunities/new" element={<OpportunityFormPage />} />
                <Route path="/opportunities/:slugOrId" element={<OpportunityDetailPage />} />
                <Route path="/opportunities/:slugOrId/edit" element={<Navigate to="/opportunities/:slugOrId" replace />} />
                <Route path="/interactions" element={<InteractionsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/compensation" element={<CompensationPage />} />
                <Route path="/parse" element={<ParseJobPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </AuthGate>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
