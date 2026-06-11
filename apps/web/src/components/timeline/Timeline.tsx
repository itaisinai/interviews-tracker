import { useMemo, type KeyboardEvent, type MouseEvent } from "react";

import { Badge } from "../badge";
import { LoadingButton } from "../loading-state";
import { MaterialIcon } from "../material-icon";
import { formatDateTime } from "../../lib/format";
import {
  displayLabelForEnumValue,
  normalizeInteractionType,
} from "../../lib/enum-labels";
import { getInteractionTimelineBadgeMeta } from "../../lib/interaction-status";
import type { Interaction } from "../../lib/types";

type TimelineProps = {
  title?: string;
  interactions: readonly Interaction[];
  className?: string;
  showHeader?: boolean;
  selectedInteractionId?: string | null;
  onSelectInteraction?: (interactionId: string) => void;
  onDeleteInteraction?: (interactionId: string) => void;
  isDeletingInteraction?: (interactionId: string) => boolean;
};

export function Timeline({
  title = "Interactions Timeline",
  interactions,
  className = "",
  showHeader = true,
  selectedInteractionId = null,
  onSelectInteraction,
  onDeleteInteraction,
  isDeletingInteraction,
}: TimelineProps) {
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

  return (
    <section className={`relative timeline-track ${className}`}>
      {showHeader ? (
        <div className="relative z-10 mb-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
            <MaterialIcon name="event" filled />
          </div>
          <h3 className="font-title-md text-title-md font-bold">{title}</h3>
        </div>
      ) : null}

      <div className="ml-10 space-y-4">
        {orderedInteractions.map((item) => {
          const badge = getInteractionTimelineBadgeMeta(item, orderedInteractions);
          const selected = selectedInteractionId === item.id;
          const isClickable = Boolean(onSelectInteraction);

          return (
            <article
              key={item.id}
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-haspopup={isClickable ? "dialog" : undefined}
              aria-expanded={isClickable ? selected : undefined}
              className={`rounded-xl border border-outline-variant bg-white p-5 shadow-sm transition-all hover:shadow-lg ${
                isClickable ? "cursor-pointer" : ""
              } ${selected ? "ring-1 ring-primary border-primary" : ""}`}
              onClick={
                onSelectInteraction
                  ? () => onSelectInteraction(item.id)
                  : undefined
              }
              onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
                if (!onSelectInteraction) return;
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectInteraction(item.id);
                }
              }}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                  {formatDateTime(item.date)}
                </span>
                <span className="h-1 w-1 rounded-full bg-outline-variant" />
                <MaterialIcon
                  name={interactionTypeIcon(item.type)}
                  className="text-primary"
                />
                <span className="font-semibold">
                  {displayLabelForEnumValue(
                    normalizeInteractionType(item.type),
                  ) ?? item.type}
                </span>
                {badge ? (
                  <Badge value={item.status} tone={badge.tone}>
                    {badge.label}
                  </Badge>
                ) : null}
              </div>
              <p className="text-body-md text-on-surface-variant">
                {item.personName ?? "No person"}
                {item.personRole ? ` · ${item.personRole}` : ""}
                {item.stage ? ` · ${item.stage}` : ""}
              </p>
              {item.outcome ? (
                <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md text-on-background">
                  <span className="font-medium text-on-surface-variant">
                    Outcome:{" "}
                  </span>
                  {item.outcome}
                </p>
              ) : null}
              {item.followUp ? (
                <p className="mt-3 rounded-lg border border-outline-variant bg-white p-3 text-body-md text-on-background">
                  <span className="font-medium text-on-surface-variant">
                    Next action:{" "}
                  </span>
                  {item.followUp}
                </p>
              ) : null}
              {onDeleteInteraction ? (
                <LoadingButton
                  compact
                  aria-label="Delete interaction"
                  className="mt-3 font-label-md text-label-md text-error"
                  icon="delete"
                  loading={
                    Boolean(
                      isDeletingInteraction &&
                      isDeletingInteraction(item.id),
                    )
                  }
                  onClick={(event: MouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    if (window.confirm("Delete this interaction?")) {
                      onDeleteInteraction(item.id);
                    }
                  }}
                >
                  Delete interaction
                </LoadingButton>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function interactionTypeIcon(type: string) {
  const normalizedType = normalizeInteractionType(type);

  if (normalizedType === "Email") return "mail";
  if (normalizedType === "Phone Call") return "call";
  if (normalizedType === "Home Assignment") return "assignment";
  if (normalizedType === "Offer") return "payments";
  if (normalizedType === "Rejection") return "cancel";
  if (normalizedType === "Follow-up") return "reply";
  return "event";
}
