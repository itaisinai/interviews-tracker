import { GmailImportPanel } from "./gmail-import-panel";
import { FilterTabs } from "./filter-tabs";
import { OpportunityInteractionTimeline } from "../interactions-timeline";
import type { Interaction, Opportunity } from "../../lib/types";
import {
  countUpcoming,
  type InteractionFilter,
  type InteractionOpportunityGroup,
} from "./interaction-flow-helpers";
import { InlineLoadingState, MaterialIcon } from "@interviews-tracker/design-system";

type MobileInteractionsFlowProps = {
  filter: InteractionFilter;
  showGmailImport: boolean;
  isFetching: boolean;
  interactions: readonly Interaction[];
  visibleGroups: InteractionOpportunityGroup[];
  opportunities: Opportunity[];
  gmailOpportunityId: string;
  gmailOpportunity: Opportunity | null;
  selectedInteractionId: string | null;
  followUpPercent: number;
  onFilterChange: (filter: InteractionFilter) => void;
  onToggleGmailImport: () => void;
  onSelectGmailOpportunity: (opportunitySlug: string) => void;
  onGmailSaved: () => void;
  onSelectInteraction: (interactionId: string) => void;
  onDeleteInteraction: (interactionId: string) => void;
  isDeletingInteraction: (interactionId: string) => boolean;
};

export function MobileInteractionsFlow({
  filter,
  showGmailImport,
  isFetching,
  interactions,
  visibleGroups,
  opportunities,
  gmailOpportunityId,
  gmailOpportunity,
  selectedInteractionId,
  followUpPercent,
  onFilterChange,
  onToggleGmailImport,
  onSelectGmailOpportunity,
  onGmailSaved,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
}: MobileInteractionsFlowProps) {
  return (
    <div className="md:hidden">
      <section className="mb-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">
              Interactions
            </h1>
            <p className="font-body-md text-on-surface-variant">
              Track networking and interview progress.
            </p>
          </div>
          {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
        </div>
        <button
          type="button"
          className={`rounded-full px-4 py-2 font-label-md text-label-md ${showGmailImport ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}
          onClick={onToggleGmailImport}
        >
          <MaterialIcon name="mail" />
          {showGmailImport ? "Hide Gmail" : "Gmail"}
        </button>
      </section>

      <section className="mb-5">
        <FilterTabs filter={filter} onChange={onFilterChange} variant="mobile" />
        <div className="grid grid-cols-2 gap-3">
          <MobileStat label="Upcoming" value={countUpcoming(interactions)} />
          <MobileStat label="Waiting for response" value={`${followUpPercent}%`} />
        </div>
      </section>

      {showGmailImport ? (
        <GmailImportPanel
          opportunities={opportunities}
          selectedOpportunityId={gmailOpportunityId}
          selectedOpportunity={gmailOpportunity}
          onSelectOpportunity={onSelectGmailOpportunity}
          onSaved={onGmailSaved}
          variant="mobile"
        />
      ) : null}

      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-title-md text-title-md font-bold">
            Opportunity timelines
          </h2>
          <span className="font-label-md text-label-md text-on-surface-variant">
            {visibleGroups.length}
          </span>
        </div>
        <TimelineList
          groups={visibleGroups}
          selectedInteractionId={selectedInteractionId}
          onSelectInteraction={onSelectInteraction}
          onDeleteInteraction={onDeleteInteraction}
          isDeletingInteraction={isDeletingInteraction}
        />
      </section>
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
      <div className="font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </div>
      <div className="mt-2 font-headline-md text-headline-md font-bold">
        {value}
      </div>
    </div>
  );
}

function TimelineList({
  groups,
  selectedInteractionId,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
}: {
  groups: InteractionOpportunityGroup[];
  selectedInteractionId: string | null;
  onSelectInteraction: (interactionId: string) => void;
  onDeleteInteraction: (interactionId: string) => void;
  isDeletingInteraction: (interactionId: string) => boolean;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <OpportunityInteractionTimeline
          key={group.opportunitySlug}
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
  );
}
