import { MemoryRouter } from "react-router-dom";

import type { Meta, StoryObj } from "@storybook/react";

import { getInteractionTimelineBadgeMeta, promoteOverdueInteractionsForRead } from "../../lib/interaction-status";
import type { Interaction, Opportunity } from "../../lib/types";
import { InteractionComposerPanel } from "../interactions-drawer/interaction-composer-panel";
import { InteractionDrawerHeader } from "../interactions-drawer/interaction-drawer-header";
import { InteractionSummaryPanel } from "../interactions-drawer/interaction-summary-panel";
import { InteractionTimelinePanel } from "../interactions-drawer/interaction-timeline-panel";

import { OpportunityInteractionTimeline } from "./opportunity-interaction-timeline";

const reevolOpportunity = {
  slug: "reevol",
  companyId: "company-reevol",
  company: {
    id: "company-reevol",
    slug: "reevol",
    name: "Reevol",
  },
  roleTitle: "Senior Full Stack Developer",
  status: "ACTIVE_PROCESS",
  pipelineType: "ACTIVE_PROCESS",
} as unknown as Opportunity;

const reevolInteractions = promoteOverdueInteractionsForRead([
  {
    slug: "reevol-phone-call-interview",
    ownerEmail: "test@example.com",
    date: "2026-06-15T12:30:00",
    type: "Phone Call",
    status: "DONE",
    personName: "Shahar Birger",
    personRole: "Interview",
    followUp: "For more details or if you need to change the time of your interview, please reply to this email.",
    jobOpportunity: reevolOpportunity,
  },
  {
    slug: "reevol-interview",
    ownerEmail: "test@example.com",
    date: "2026-06-17T14:00:00",
    type: "Interview",
    status: "SCHEDULED",
    personName: "Asaf Halfon",
    personRole: "Interview",
    outcome: "Advanced to final round",
    jobOpportunity: reevolOpportunity,
  },
] satisfies Interaction[]);

const reevolSelectedInteraction = reevolInteractions[1];
const reevolHeaderBadge = getInteractionTimelineBadgeMeta(reevolSelectedInteraction, reevolInteractions);
const storyReferenceDate = new Date("2026-06-15T12:00:00.000Z");

const meta: Meta<typeof OpportunityInteractionTimeline> = {
  title: "Interactions/Opportunity Timeline",
  component: OpportunityInteractionTimeline,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof OpportunityInteractionTimeline>;

export const ExpandedPage: Story = {
  args: {
    companyName: reevolOpportunity.company.name,
    roleTitle: reevolOpportunity.roleTitle,
    interactions: reevolInteractions,
    selectedInteractionSlug: reevolSelectedInteraction.slug,
    defaultCollapsed: false,
    referenceDate: storyReferenceDate,
  },
  render: (args) => (
    <div className="min-h-screen bg-[#f7f5ef] p-6">
      <div className="mx-auto max-w-[60rem]">
        <OpportunityInteractionTimeline {...args} onSelectInteraction={() => void 0} />
      </div>
    </div>
  ),
};

export const DrawerOpen: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f7f5ef] p-6">
      <div className="mx-auto max-w-[48rem] overflow-hidden rounded-[28px] border border-outline-variant bg-[#f7f5ef] shadow-xl">
        <InteractionDrawerHeader
          opportunity={reevolOpportunity}
          interaction={reevolSelectedInteraction}
          onClose={() => void 0}
        />
        <div className="space-y-4 p-5">
          <InteractionSummaryPanel
            interaction={reevolSelectedInteraction}
            headerBadge={reevolHeaderBadge}
            isEditing={false}
            draft={null}
            onToggleEditing={() => void 0}
            onCancelEditing={() => void 0}
            onDraftChange={() => void 0}
            onSave={() => void 0}
            isSaving={false}
            onDelete={() => void 0}
            isDeleting={false}
          />
          <InteractionTimelinePanel
            companyName={reevolOpportunity.company.name}
            interactions={reevolInteractions}
            selectedInteractionSlug={reevolSelectedInteraction.slug}
            referenceDate={storyReferenceDate}
            onSelectInteraction={() => void 0}
          />
          <InteractionComposerPanel
            opportunitySlug={reevolOpportunity.slug}
            companyName={reevolOpportunity.company.name}
            roleTitle={reevolOpportunity.roleTitle}
            attachToInteractionSlug={reevolSelectedInteraction.slug}
            composer={null}
            onComposerChange={() => void 0}
            onSaved={() => void 0}
          />
        </div>
      </div>
    </div>
  ),
};

export const CombinedState: Story = {
  render: () => (
    <div className="min-h-screen bg-[#f7f5ef] p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_48rem] gap-4">
        <div className="space-y-4">
          <OpportunityInteractionTimeline
            companyName={reevolOpportunity.company.name}
            roleTitle={reevolOpportunity.roleTitle}
            interactions={reevolInteractions}
            selectedInteractionSlug={reevolSelectedInteraction.slug}
            defaultCollapsed={false}
            referenceDate={storyReferenceDate}
            onSelectInteraction={() => void 0}
          />
          <OpportunityInteractionTimeline
            companyName="Alta"
            roleTitle="Senior Software Engineer"
            interactions={[
              {
                slug: "alta-1",
                date: "2026-06-14T09:00:00",
                type: "Interview",
                status: "DONE",
                personName: "Alta Recruiter",
                personRole: "Interview",
                jobOpportunity: {
                  ...reevolOpportunity,
                  companyName: "Alta",
                  roleTitle: "Senior Software Engineer",
                } as unknown as Opportunity,
              } as Interaction,
            ]}
            selectedInteractionSlug={null}
            defaultCollapsed
            onSelectInteraction={() => void 0}
          />
        </div>
        <div>
          <div className="overflow-hidden rounded-[28px] border border-outline-variant bg-[#f7f5ef] shadow-xl">
            <InteractionDrawerHeader
              opportunity={reevolOpportunity}
              interaction={reevolSelectedInteraction}
              onClose={() => void 0}
            />
            <div className="space-y-4 p-5">
              <InteractionSummaryPanel
                interaction={reevolSelectedInteraction}
                headerBadge={reevolHeaderBadge}
                isEditing={false}
                draft={null}
                onToggleEditing={() => void 0}
                onCancelEditing={() => void 0}
                onDraftChange={() => void 0}
                onSave={() => void 0}
                isSaving={false}
                onDelete={() => void 0}
                isDeleting={false}
              />
              <InteractionTimelinePanel
                companyName={reevolOpportunity.company.name}
                interactions={reevolInteractions}
                selectedInteractionSlug={reevolSelectedInteraction.slug}
                referenceDate={storyReferenceDate}
                onSelectInteraction={() => void 0}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
