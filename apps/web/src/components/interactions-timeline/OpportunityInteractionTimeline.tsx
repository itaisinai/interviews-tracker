import { useMemo } from "react";

import { Badge } from "../badge";
import { Timeline } from "../timeline";
import { getOpportunityProcessBadgeMeta } from "../../lib/interaction-status";
import type { Interaction } from "../../lib/types";

type OpportunityInteractionTimelineProps = {
  companyName: string;
  roleTitle: string;
  interactions: Interaction[];
  selectedInteractionId: string | null;
  onSelectInteraction: (interactionId: string) => void;
  onDeleteInteraction: (interactionId: string) => void;
  isDeletingInteraction: (interactionId: string) => boolean;
};

export function OpportunityInteractionTimeline({
  companyName,
  roleTitle,
  interactions,
  selectedInteractionId,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
}: OpportunityInteractionTimelineProps) {
  const orderedInteractions = useMemo(() => {
    return [...interactions].sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.id.localeCompare(right.id);
    });
  }, [interactions]);

  const opportunityBadge = useMemo(
    () =>
      getOpportunityProcessBadgeMeta(
        orderedInteractions[0]?.jobOpportunity ?? null,
        orderedInteractions,
      ),
    [orderedInteractions],
  );

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-outline-variant px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="truncate font-title-md text-title-md font-bold text-on-background">
                {companyName}
              </h3>
              <span className="text-body-md text-on-surface-variant">·</span>
              <p className="truncate text-body-md text-on-surface-variant">
                {roleTitle}
              </p>
              {opportunityBadge ? (
                <Badge value={opportunityBadge.label} tone={opportunityBadge.tone}>
                  {opportunityBadge.label}
                </Badge>
              ) : null}
            </div>
          </div>
          <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
            {orderedInteractions.length}{" "}
            {orderedInteractions.length === 1 ? "interaction" : "interactions"}
          </div>
        </div>
      </div>

      <Timeline
        className="px-4 py-4 md:px-6 md:py-5"
        interactions={orderedInteractions}
        showHeader={false}
        selectedInteractionId={selectedInteractionId}
        onSelectInteraction={onSelectInteraction}
        onDeleteInteraction={onDeleteInteraction}
        isDeletingInteraction={isDeletingInteraction}
      />
    </section>
  );
}
