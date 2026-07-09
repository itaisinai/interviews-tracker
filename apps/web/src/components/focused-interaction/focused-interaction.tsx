import { MaterialIcon } from "@interviews-tracker/design-system";

import { displayLabelForEnumValue, normalizeInteractionType } from "../../lib/enum-labels";
import { formatDateTime, formatDurationBetween } from "../../lib/format";
import { getInteractionTimelineBadgeMeta } from "../../lib/interaction-status";
import type { Interaction } from "../../lib/types";

export type FocusedInteractionProps = {
  interaction: Interaction;
  allInteractions: Interaction[];
  className?: string;
};

export function FocusedInteraction({ interaction, allInteractions, className = "" }: FocusedInteractionProps) {
  const typeLabel = displayLabelForEnumValue(normalizeInteractionType(interaction.type)) ?? interaction.type;
  const durationLabel = formatDurationBetween(interaction.date, interaction.endDate);
  const headerBadge = getInteractionTimelineBadgeMeta(interaction, allInteractions);

  const personNames = interaction.personName
    ? interaction.personName
        .split(/\s+and\s+|,\s*/)
        .map((name) => name.trim())
        .filter(Boolean)
    : [];

  return (
    <section className={`rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1 min-w-0">
          {/* Icon + Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <MaterialIcon name="calendar_month" className="text-[24px]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">
                {interaction.stage || typeLabel}
                {durationLabel && <span className="text-neutral-500"> ({durationLabel})</span>}
              </h2>
              {/* Date, Time, Badges - All inline */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-sm text-neutral-600">
                  {new Date(interaction.date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="text-neutral-400">•</span>
                <span className="text-sm text-neutral-600">
                  {new Date(interaction.date).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  {interaction.endDate && (
                    <>
                      {" - "}
                      {new Date(interaction.endDate).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </>
                  )}
                  {durationLabel && <span className="text-neutral-500"> ({durationLabel})</span>}
                </span>
                <span className="text-neutral-400">•</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-xs font-medium">
                  {typeLabel}
                </span>
                {headerBadge && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    {headerBadge.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Participants */}
          {personNames.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-neutral-900 mb-3">Participants</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {personNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50">
                    <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 text-sm font-medium">
                      {name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900">{name}</div>
                      {interaction.personRole && index === 0 && (
                        <div className="text-xs text-neutral-500">{interaction.personRole}</div>
                      )}
                    </div>
                    <button className="p-1.5 rounded-lg hover:bg-neutral-200 text-neutral-400 hover:text-neutral-600 transition-colors">
                      <MaterialIcon name="person_search" className="text-[16px]" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Join Meeting Button */}
        {interaction.meetingLink && (
          <a
            href={interaction.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2 whitespace-nowrap"
          >
            <MaterialIcon name="videocam" className="text-[18px]" />
            Join meeting
          </a>
        )}
      </div>
    </section>
  );
}
