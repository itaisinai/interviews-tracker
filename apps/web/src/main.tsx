import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/auth-gate";
import { AppShell } from "./components/app-shell";
import { queryClient } from "./lib/query-client";
import { DashboardPage } from "./pages/dashboard-page";
import { OpportunitiesPage } from "./pages/opportunities-page";
import { CompaniesPage } from "./pages/companies-page";
import { CompanyDetailPage } from "./pages/company-detail-page";
import { OpportunityDetailPage } from "./pages/opportunity-detail-page";
import { OpportunityFormPage } from "./pages/opportunity-form-page";
import { InteractionsPage } from "./pages/interactions-page";
import { TasksPage } from "./pages/tasks-page";
import { CompensationPage } from "./pages/compensation-page";
import { SettingsPage } from "./pages/settings-page";
import { ParseJobPage } from "./pages/parse-job-page";
import "@interviews-tracker/design-system/styles/tokens.css";
import "./styles.css";

function App() {
  return (
    <AuthGate>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
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
        </BrowserRouter>
      </QueryClientProvider>
    </AuthGate>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
