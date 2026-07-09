import { MaterialIcon } from "@interviews-tracker/design-system";

import { Badge } from "../badge";

type InteractionHeaderProps = {
  stage: string | null;
  typeLabel: string;
  date: string;
  endDate: string | null;
  durationLabel: string | null;
  type: string;
  statusBadge: {
    label: string;
    tone: "blue" | "green" | "red" | "muted" | "warning";
  } | null;
};

/**
 * Interaction header with title, date, time, and badges
 */
export function InteractionHeader({
  stage,
  typeLabel,
  date,
  endDate,
  durationLabel,
  type,
  statusBadge,
}: InteractionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 mb-8">
      <div className="flex-1 min-w-0">
        {/* Title with Icon */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-600">
            <MaterialIcon name="calendar_month" className="text-[20px]" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{stage || typeLabel}</h1>
        </div>

        {/* Date and Time */}
        <div className="flex items-center gap-2 text-base text-neutral-700 mb-3 ml-[52px]">
          <span className="font-medium">
            {new Date(date).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-neutral-400">·</span>
          <span>
            {new Date(date).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
            {endDate && (
              <>
                {" – "}
                {new Date(endDate).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </>
            )}
          </span>
          {durationLabel && (
            <>
              <span className="text-neutral-400">·</span>
              <span className="text-neutral-600">{durationLabel}</span>
            </>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 ml-[52px] flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">
            <MaterialIcon name="event" className="text-[14px]" />
            {typeLabel}
          </span>
          {statusBadge && <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>}
        </div>
      </div>
    </div>
  );
}
