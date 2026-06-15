import { useMemo, useState } from "react";

import { Badge } from "../badge";
import { Timeline } from "../timeline";
import { getOpportunityProcessBadgeMeta } from "../../lib/interaction-status";
import type { Interaction } from "../../lib/types";
import { MaterialIcon } from "@interviews-tracker/design-system";

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
  const [collapsed, setCollapsed] = useState(true);
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
  const latestInteraction = orderedInteractions.at(-1) ?? null;
  const nextStepText =
    latestInteraction?.followUp?.trim() ||
    latestInteraction?.stage?.trim() ||
    latestInteraction?.outcome?.trim() ||
    latestInteraction?.type?.trim() ||
    null;

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-outline-variant px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-h-9 flex-wrap items-center gap-3">
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
            <p
              className={`mt-1 font-body-md text-body-md font-semibold text-on-background ${
                collapsed ? "" : "invisible"
              }`}
            >
              {nextStepText ? `Next step: ${nextStepText}` : "Next step: Review"}
            </p>
          </div>
          <div className="mt-1 self-start rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
            {orderedInteractions.length}{" "}
            {orderedInteractions.length === 1 ? "interaction" : "interactions"}
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 self-start items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low"
            aria-label={collapsed ? "Expand timeline" : "Collapse timeline"}
            title={collapsed ? "Expand timeline" : "Collapse timeline"}
            onClick={() => setCollapsed((value) => !value)}
          >
            <MaterialIcon name={collapsed ? "expand_less" : "expand_more"} />
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <Timeline
          className="px-4 py-2.5 md:px-5 md:py-3.5"
          interactions={orderedInteractions}
          showHeader={false}
          selectedInteractionId={selectedInteractionId}
          onSelectInteraction={onSelectInteraction}
          onDeleteInteraction={onDeleteInteraction}
          isDeletingInteraction={isDeletingInteraction}
        />
      )}
    </section>
  );
}
