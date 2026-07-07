import type { Meta, StoryObj } from "@storybook/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { CompanyDetailView } from "./company-detail-view";
import { promoteOverdueInteractionsForRead } from "../../lib/interaction-status";
import type { CompanyDetail } from "../../lib/types";

const queryClient = new QueryClient();
const referenceDate = new Date("2026-06-15T12:00:00.000Z");

const reevolCompany = {
  companyName: "Reevol",
  status: "RESEARCH_LEAD",
  opportunities: [
    {
      id: "reevol-opportunity",
      slug: "reevol-senior-full-stack-developer",
      companyName: "Reevol",
      roleTitle: "Senior Full Stack Developer",
      status: "ACTIVE_PROCESS",
      pipelineType: "ACTIVE_PROCESS",
      companySearchName: null,
      linkedinUrl: "https://www.linkedin.com/company/reevolai/",
      funding: "17M USD Seed",
      customersTraction: "Startup in the Fintech sector.",
      companyDescription: "Startup in the Fintech sector.",
      productDescription: null,
      location: "Tel Aviv, Israel",
      employeesRange: { label: "1-10" },
      companyStage: { label: "Growth AI Startup" },
      workModel: { label: "Hybrid" },
      techStack: "Node.js, React, TypeScript",
      backendFrontendSplit: "Full Stack",
      compensationNotes: null,
      notes: null,
      domains: [
        { domain: { label: "Fintech" } },
        { domain: { label: "reevol.com" } },
      ],
      interactions: [],
      nextStep: "Interview",
      updatedAt: "2026-06-15T12:30:00.000Z",
    },
  ],
  interactions: promoteOverdueInteractionsForRead([
    {
      slug: "reevol-phone-2026-06-15",
      date: "2026-06-15T12:30:00",
      type: "Phone Call",
      status: "DONE",
      stage: null,
      outcome: null,
      followUp:
        "For more details or if you need to change the time of your interview, please reply to this email.",
    },
    {
      slug: "reevol-interview-2026-06-17",
      date: "2026-06-17T14:00:00",
      type: "Interview",
      status: "SCHEDULED",
      stage: null,
      outcome: "Advanced to final round",
      followUp: null,
    },
  ]),
} as unknown as CompanyDetail;

const meta: Meta<typeof CompanyDetailView> = {
  title: "Company Detail View",
  component: CompanyDetailView,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof CompanyDetailView>;

export const ReevolOverview: Story = {
  args: {
    company: reevolCompany,
    isRefreshing: false,
    isDeletingCompany: false,
    onDeleteCompany: () => void 0,
    onDeleteInteraction: () => void 0,
    isDeletingInteraction: () => false,
    referenceDate,
  },
};
