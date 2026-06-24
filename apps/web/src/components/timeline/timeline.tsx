import { useMemo, type KeyboardEvent } from "react";
import {
  Ban,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Mail,
  PhoneCall,
  Plus,
  Reply,
  Trash2,
} from "lucide-react";

import { Badge } from "../badge";
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
  onAddInteraction?: () => void;
  isDeletingInteraction?: (interactionId: string) => boolean;
  referenceDate?: Date;
};

export function Timeline({
  title = "Interactions Timeline",
  interactions,
  className = "",
  showHeader = true,
  selectedInteractionId = null,
  onSelectInteraction,
  onDeleteInteraction,
  onAddInteraction,
  isDeletingInteraction,
  referenceDate = new Date(),
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
    <section className={`relative ${className}`}>
      {showHeader ? (
        <div className="relative z-10 mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
              <CalendarDays className="h-5 w-5" />
            </div>
            <h3 className="font-title-md text-title-md font-bold">Timeline</h3>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {title}
            </span>
          </div>
          {onAddInteraction ? (
            <button
              type="button"
              onClick={onAddInteraction}
              className="inline-flex items-center gap-2 rounded-lg border border-outline-variant bg-white px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-container"
            >
              <Plus className="h-4 w-4" />
              <span>Add Interaction</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {orderedInteractions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-outline-variant bg-surface-container-low/60 p-4 text-body-md text-on-surface-variant">
          No interactions found for this opportunity yet.
        </div>
      ) : (
        <ol className="relative ml-8">
          {orderedInteractions.length > 1 ? (
            <div
              className="absolute bottom-6 left-0 top-6 border-l border-outline-variant"
              aria-hidden="true"
            />
          ) : null}
          {orderedInteractions.map((item, index) => {
            const badge = getInteractionTimelineBadgeMeta(
              item,
              orderedInteractions,
            );
            const isSelected = selectedInteractionId === item.id;
            const isUpcoming =
              new Date(item.date).getTime() > referenceDate.getTime();
            const isClickable = Boolean(onSelectInteraction);
            const isDeleting = isDeletingInteraction?.(item.slug || item.id) ?? false;

            return (
              <li
                key={item.id}
                className={`relative py-4 first:pt-1 last:pb-1 ${isSelected ? "rounded-2xl bg-primary/5" : ""}`}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="relative min-w-0">
                    <span
                      className={`absolute left-0 top-6 z-10 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 ${
                        isUpcoming
                          ? "border-primary bg-white"
                          : "border-primary bg-primary"
                      }`}
                      aria-hidden="true"
                    />
                    <button
                      type={isClickable ? "button" : undefined}
                      className={`block w-full rounded-2xl text-left transition-colors ${
                        isClickable
                          ? "cursor-pointer hover:bg-surface-container-low/60"
                          : ""
                      }`}
                      onClick={
                        onSelectInteraction
                          ? () => onSelectInteraction(item.id)
                          : undefined
                      }
                      onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
                        if (!onSelectInteraction) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelectInteraction(item.id);
                        }
                      }}
                    >
                      <div className="space-y-2 px-4 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                            {formatDateTime(item.date, referenceDate)}
                          </span>
                          {isUpcoming ? (
                            <Badge value="Upcoming" tone="warning">
                              Upcoming
                            </Badge>
                          ) : null}
                          {badge ? (
                            <Badge value={item.status} tone={badge.tone}>
                              {badge.label}
                            </Badge>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <InteractionTypeIcon type={item.type} />
                          <span className="font-title-sm text-title-sm font-bold text-on-background">
                            {displayLabelForEnumValue(
                              normalizeInteractionType(item.type),
                            ) ?? item.type}
                          </span>
                        </div>

                        <p className="text-body-md text-on-surface-variant">
                          {item.personName ?? "No person"}
                          {item.personRole ? ` · ${item.personRole}` : ""}
                          {item.stage ? ` · ${item.stage}` : ""}
                        </p>
                      </div>
                    </button>
                    {index < orderedInteractions.length - 1 ? (
                      <div className="h-0.5" aria-hidden="true" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    {item.followUp ? (
                      <div className="rounded-xl border border-outline-variant bg-surface-container-low/60 px-3 py-2 text-body-md text-on-background">
                        <span className="font-semibold text-on-surface-variant">
                          Next action:{" "}
                        </span>
                        {item.followUp}
                      </div>
                    ) : null}
                    {onDeleteInteraction ? (
                      <div className="mt-3 flex items-center justify-end">
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-white px-3 py-1.5 text-label-md text-error transition-colors hover:bg-error-container"
                          aria-label="Delete interaction"
                          onClick={(event) => {
                            event.stopPropagation();
                            onDeleteInteraction(item.slug || item.id);
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>{isDeleting ? "Deleting" : "Delete"}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function InteractionTypeIcon({ type }: { type: string }) {
  const normalizedType = normalizeInteractionType(type);

  if (normalizedType === "Email")
    return <Mail className="h-4 w-4 text-primary" />;
  if (normalizedType === "Phone Call")
    return <PhoneCall className="h-4 w-4 text-primary" />;
  if (normalizedType === "Home Assignment")
    return <ClipboardList className="h-4 w-4 text-primary" />;
  if (normalizedType === "Offer")
    return <CircleDollarSign className="h-4 w-4 text-primary" />;
  if (normalizedType === "Rejection")
    return <Ban className="h-4 w-4 text-primary" />;
  if (normalizedType === "Follow-up")
    return <Reply className="h-4 w-4 text-primary" />;
  return <CalendarDays className="h-4 w-4 text-primary" />;
}
