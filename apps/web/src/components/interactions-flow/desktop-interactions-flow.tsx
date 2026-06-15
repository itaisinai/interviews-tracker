import { AppCalendar } from "../calendar";
import { FilterTabs } from "./filter-tabs";
import { GmailImportPanel } from "./gmail-import-panel";
import { InteractionHealthPanel } from "./interaction-health-panel";
import { OpportunityInteractionTimeline } from "../interactions-timeline";
import { PageIntro } from "../app-shell";
import type { Interaction, Opportunity } from "../../lib/types";
import type {
  InteractionCalendarEvent,
  InteractionFilter,
  InteractionOpportunityGroup,
} from "./interaction-flow-helpers";
import { InlineLoadingState, MaterialIcon } from "@interviews-tracker/design-system";

type DesktopInteractionsFlowProps = {
  filter: InteractionFilter;
  showGmailImport: boolean;
  isFetching: boolean;
  interactions: readonly Interaction[];
  visibleGroups: InteractionOpportunityGroup[];
  opportunities: Opportunity[];
  gmailOpportunityId: string;
  gmailOpportunity: Opportunity | null;
  selectedInteractionId: string | null;
  calendarEvents: InteractionCalendarEvent[];
  followUpCount: number;
  followUpPercent: number;
  onFilterChange: (filter: InteractionFilter) => void;
  onOpenGmailImport: () => void;
  onCloseGmailImport: () => void;
  onSelectGmailOpportunity: (opportunityId: string) => void;
  onGmailSaved: () => void;
  onSelectInteraction: (interactionId: string) => void;
  onDeleteInteraction: (interactionId: string) => void;
  isDeletingInteraction: (interactionId: string) => boolean;
};

export function DesktopInteractionsFlow({
  filter,
  showGmailImport,
  isFetching,
  interactions,
  visibleGroups,
  opportunities,
  gmailOpportunityId,
  gmailOpportunity,
  selectedInteractionId,
  calendarEvents,
  followUpCount,
  followUpPercent,
  onFilterChange,
  onOpenGmailImport,
  onCloseGmailImport,
  onSelectGmailOpportunity,
  onGmailSaved,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
}: DesktopInteractionsFlowProps) {
  return (
    <div className="hidden md:block">
      <PageIntro
        title="Interactions"
        description="Track your networking and interview progress with precision."
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={showGmailImport ? onCloseGmailImport : onOpenGmailImport}
            >
              <MaterialIcon name="mail" />
              {showGmailImport ? "Hide Gmail Import" : "Add interaction from Gmail"}
            </button>
          </>
        }
      />
      {showGmailImport ? (
        <GmailImportPanel
          opportunities={opportunities}
          selectedOpportunityId={gmailOpportunityId}
          selectedOpportunity={gmailOpportunity}
          onSelectOpportunity={onSelectGmailOpportunity}
          onClose={onCloseGmailImport}
          onSaved={onGmailSaved}
          variant="desktop"
        />
      ) : null}
      <FilterTabs filter={filter} onChange={onFilterChange} variant="desktop" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-7">
          <TimelineHeading />
          <div className="space-y-4">
            {visibleGroups.map((group) => (
              <OpportunityInteractionTimeline
                key={group.opportunityId}
                companyName={group.companyName}
                roleTitle={group.roleTitle}
                interactions={group.interactions}
                selectedInteractionId={selectedInteractionId}
                onSelectInteraction={onSelectInteraction}
                onDeleteInteraction={onDeleteInteraction}
                isDeletingInteraction={isDeletingInteraction}
              />
            ))}
          </div>
        </section>
        <aside className="space-y-4 lg:col-span-5">
          <AppCalendar eyebrow="Calendar" events={calendarEvents} />
          <InteractionHealthPanel
            interactions={interactions}
            followUpCount={followUpCount}
            followUpPercent={followUpPercent}
          />
        </aside>
      </div>
    </div>
  );
}

function TimelineHeading() {
  return (
    <div className="relative z-10 flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
        <MaterialIcon name="event" filled />
      </div>
      <div className="min-w-0">
        <h3 className="font-title-md text-title-md font-bold">
          Opportunity timelines
        </h3>
        <p className="text-body-md text-on-surface-variant">
          Each opportunity is grouped into its own timeline.
        </p>
      </div>
    </div>
  );
}
