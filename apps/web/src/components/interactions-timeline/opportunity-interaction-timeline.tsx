import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ArrowUpRight, ChevronDown, ChevronUp } from "lucide-react";

import { getOpportunityProcessBadgeMeta } from "../../lib/interaction-status";
import type { Interaction } from "../../lib/types";
import { Badge } from "../badge";
import { Timeline } from "../timeline";

type OpportunityInteractionTimelineProps = {
  companyName: string;
  roleTitle: string;
  interactions: Interaction[];
  opportunity?: Pick<any, "slug" | "roleTitle" | "status" | "priority" | "pipelineType"> | null;
  selectedInteractionSlug: string | null;
  onSelectInteraction: (interactionSlug: string) => void;
  onDeleteInteraction?: (interactionSlug: string) => void;
  isDeletingInteraction?: (interactionSlug: string) => boolean;
  opportunityHref?: string;
  defaultCollapsed?: boolean;
  referenceDate?: Date;
};

export function OpportunityInteractionTimeline({
  companyName,
  roleTitle,
  interactions,
  opportunity,
  selectedInteractionSlug,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
  opportunityHref,
  defaultCollapsed = true,
  referenceDate = new Date(),
}: OpportunityInteractionTimelineProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const orderedInteractions = useMemo(() => {
    return [...interactions].sort((left, right) => {
      const leftTime = new Date(left.date).getTime();
      const rightTime = new Date(right.date).getTime();
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return left.slug.localeCompare(right.slug);
    });
  }, [interactions]);

  const opportunityBadge = useMemo(
    () =>
      getOpportunityProcessBadgeMeta(
        opportunity ?? orderedInteractions[0]?.jobOpportunity ?? null,
        orderedInteractions
      ),
    [opportunity, orderedInteractions]
  );
  const latestInteraction = orderedInteractions.at(-1) ?? null;
  const nextStepText =
    latestInteraction?.followUp?.trim() ||
    latestInteraction?.stage?.trim() ||
    latestInteraction?.outcome?.trim() ||
    latestInteraction?.type?.trim() ||
    null;
  const openLatestInteraction = () => {
    if (latestInteraction) {
      onSelectInteraction(latestInteraction.slug);
    }
  };

  return (
    <section className="panel overflow-hidden transition-colors hover:border-primary/20 hover:bg-primary/5">
      <div className="border-b border-outline-variant px-4 py-3 md:px-5 md:py-4">
        <div className="flex items-start gap-3">
          <div
            role={latestInteraction ? "button" : undefined}
            tabIndex={latestInteraction ? 0 : undefined}
            aria-label={latestInteraction ? `Open ${companyName} ${roleTitle} interaction drawer` : undefined}
            className={`min-w-0 flex-1 rounded-xl px-2 py-1 transition-colors ${
              latestInteraction ? "cursor-pointer" : ""
            }`}
            onClick={openLatestInteraction}
            onKeyDown={(event) => {
              if (!latestInteraction) {
                return;
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openLatestInteraction();
              }
            }}
          >
            <div className="flex min-h-9 flex-wrap items-center gap-3">
              <h3 className="truncate font-title-md text-title-md font-bold text-on-background">{companyName}</h3>
              <span className="text-body-md text-on-surface-variant">·</span>
              <p className="truncate text-body-md text-on-surface-variant">{roleTitle}</p>
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
            {orderedInteractions.length} {orderedInteractions.length === 1 ? "interaction" : "interactions"}
          </div>
          {opportunityHref ? (
            <Link
              to={opportunityHref}
              className="inline-flex h-9 w-9 shrink-0 self-start items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low"
              aria-label={`Open ${companyName} opportunity page`}
              title={`Open ${companyName} opportunity page`}
              onClick={(event) => event.stopPropagation()}
            >
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 self-start items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low"
            aria-label={collapsed ? "Expand timeline" : "Collapse timeline"}
            title={collapsed ? "Expand timeline" : "Collapse timeline"}
            onClick={(event) => {
              event.stopPropagation();
              setCollapsed((value) => !value);
            }}
          >
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <Timeline
          className="px-4 py-2.5 md:px-5 md:py-3.5"
          interactions={orderedInteractions}
          showHeader={false}
          selectedInteractionSlug={selectedInteractionSlug}
          onSelectInteraction={onSelectInteraction}
          onDeleteInteraction={onDeleteInteraction}
          isDeletingInteraction={isDeletingInteraction}
          referenceDate={referenceDate}
        />
      )}
    </section>
  );
}
