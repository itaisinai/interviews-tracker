import { useMemo } from "react";
import type { Interaction } from "../../lib/types";
import { Badge } from "../badge";
import { LoadingButton } from "../loading-state";
import { MaterialIcon } from "../material-icon";
import { formatDateTime } from "../../lib/format";
import { getInteractionTimelineBadgeMeta, getOpportunityProcessBadgeMeta } from "../../lib/interaction-status";

function getInteractionIconName(type: string) {
  if (type.toLowerCase().includes("email")) {
    return "mail";
  }

  if (type.toLowerCase().includes("offer")) {
    return "approval";
  }

  if (type.toLowerCase().includes("reject")) {
    return "cancel";
  }

  return "call";
}

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
  isDeletingInteraction
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
  const opportunityBadge = useMemo(() => getOpportunityProcessBadgeMeta(orderedInteractions[0]?.jobOpportunity ?? null, orderedInteractions), [orderedInteractions]);

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-outline-variant px-4 py-4 md:px-6 md:py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant">Opportunity timeline</p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h3 className="truncate font-title-md text-title-md font-bold text-on-background">{companyName}</h3>
              {opportunityBadge ? (
                <Badge value={opportunityBadge.label} tone={opportunityBadge.tone}>
                  {opportunityBadge.label}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 truncate text-body-md text-on-surface-variant">{roleTitle}</p>
          </div>
          <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
            {orderedInteractions.length} {orderedInteractions.length === 1 ? "interaction" : "interactions"}
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4 md:p-6">
        {orderedInteractions.map((item) => {
          const selected = selectedInteractionId === item.id;
          const badge = getInteractionTimelineBadgeMeta(item, orderedInteractions);
          return (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              aria-haspopup="dialog"
              aria-expanded={selected}
              className={`cursor-pointer rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                selected ? "border-primary ring-1 ring-primary" : "border-outline-variant"
              }`}
              onClick={() => onSelectInteraction(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectInteraction(item.id);
                }
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">{formatDateTime(item.date)}</span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <MaterialIcon name={getInteractionIconName(item.type)} className="text-primary" />
                <span className="font-semibold text-on-background">{item.type}</span>
                {badge ? (
                  <Badge value={item.status} tone={badge.tone}>
                    {badge.label}
                  </Badge>
                ) : null}
              </div>

              <h4 className="mt-3 font-headline-md text-headline-md font-bold text-on-background">{item.jobOpportunity?.companyName}</h4>
              <p className="mt-1 text-body-md text-on-surface-variant">
                {item.jobOpportunity?.roleTitle} · {item.stage ?? "No stage"} · {item.personName ?? "No person"}
              </p>

              {item.personRole ? <p className="mt-1 text-body-md text-on-surface-variant">{item.personRole}</p> : null}

              {item.outcome ? (
                <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md text-on-background">
                  <span className="font-medium text-on-surface-variant">Outcome: </span>
                  {item.outcome}
                </p>
              ) : null}

              {item.followUp ? (
                <p className="mt-3 rounded-lg border border-outline-variant bg-white p-3 text-body-md text-on-background">
                  <span className="font-medium text-on-surface-variant">Next action: </span>
                  {item.followUp}
                </p>
              ) : null}

              <div className="mt-4 flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{formatDateTime(item.date)}</span>
                <LoadingButton
                  compact
                  aria-label="Delete interaction"
                  className="text-error"
                  icon="delete"
                  loading={isDeletingInteraction(item.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (window.confirm("Delete this interaction?")) {
                      onDeleteInteraction(item.id);
                    }
                  }}
                >
                  Delete
                </LoadingButton>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
