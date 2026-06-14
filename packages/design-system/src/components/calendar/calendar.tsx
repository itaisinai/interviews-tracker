import type { ReactNode } from "react";
import { createMonthCalendar, type CalendarEvent, type CalendarEventTone } from "./calendar-utils.js";
import { MaterialIcon } from "../material-icon/index.js";

export type CalendarProps<Event extends CalendarEvent = CalendarEvent> = {
  events: readonly Event[];
  month: Date;
  eyebrow?: string;
  title?: string;
  emptyLabel?: string;
  singleEventLabel?: string;
  multipleEventsLabel?: string;
  eventCountLabel?: (count: number) => string;
  renderEvent?: (event: Event) => ReactNode;
  onPreviousMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
  className?: string;
};

const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });
const tooltipDateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  month: "short",
  day: "numeric",
});
const accessibleDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  day: "numeric",
});
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dotClassNames: Record<CalendarEventTone, string> = {
  empty: "bg-outline-variant",
  single: "bg-primary shadow-[0_0_0_3px_rgba(0,121,83,0.14)]",
  multiple: "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]",
};

export function Calendar<Event extends CalendarEvent = CalendarEvent>({
  events,
  month,
  eyebrow = "Calendar",
  title,
  emptyLabel = "Empty",
  singleEventLabel = "1 meeting",
  multipleEventsLabel = "Multiple",
  eventCountLabel = (count) => `${count} ${count === 1 ? "meeting" : "meetings"}`,
  renderEvent,
  onPreviousMonth,
  onNextMonth,
  onToday,
  className = "",
}: CalendarProps<Event>) {
  const calendar = createMonthCalendar({ events, month });

  return (
    <section className={["rounded-xl border border-outline-variant bg-white p-6 shadow-sm", className].join(" ")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
          <h3 className="mt-1 font-title-md text-title-md font-bold text-on-background">
            {title ?? calendar.monthLabel}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {onPreviousMonth ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low"
              onClick={onPreviousMonth}
              aria-label="Previous month"
              title="Previous month"
            >
              <MaterialIcon name="chevron_left" />
            </button>
          ) : null}
          {onToday ? (
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-outline-variant bg-white px-3 font-label-md text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
              onClick={onToday}
              aria-label="Today"
              title="Today"
            >
              <MaterialIcon name="today" className="text-[18px]" />
              Today
            </button>
          ) : null}
          {onNextMonth ? (
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant bg-white text-on-surface-variant transition-colors hover:bg-surface-container-low"
              onClick={onNextMonth}
              aria-label="Next month"
              title="Next month"
            >
              <MaterialIcon name="chevron_right" />
            </button>
          ) : null}
          <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
            {eventCountLabel(calendar.totalEvents)}
          </div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-label-sm font-medium text-on-surface-variant">
        <CalendarLegendDot className="bg-outline-variant" label={emptyLabel} />
        <CalendarLegendDot className="bg-primary" label={singleEventLabel} />
        <CalendarLegendDot className="bg-amber-400" label={multipleEventsLabel} />
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {weekdayLabels.map((day) => (
          <div key={day} className="py-1 font-label-sm text-label-sm text-on-surface-variant">
            {day}
          </div>
        ))}
        {Array.from({ length: calendar.leadingBlankDays }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}
        {calendar.days.map((day) => (
          <div key={day.key} className="group relative">
            <div
              className={`flex min-h-12 flex-col items-center justify-center rounded-xl border transition-all ${
                day.events.length > 0
                  ? "border-primary/15 bg-primary/5 text-on-background hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:shadow-sm"
                  : "border-transparent bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container-low"
              } ${day.isToday ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : ""}`}
              aria-label={getAccessibleLabel(day.date, day.events)}
              tabIndex={0}
            >
              <span className="font-label-md text-label-md">{dayFormatter.format(day.date)}</span>
              <span className={`mt-1 h-2 w-2 rounded-full ${dotClassNames[day.tone]}`} />
              {day.isToday ? (
                <span className="mt-1 rounded-full bg-primary px-2 py-0.5 font-label-sm text-label-sm text-on-primary">
                  Today
                </span>
              ) : null}
            </div>

            <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden w-64 -translate-x-1/2 rounded-xl border border-outline-variant bg-white p-3 text-left shadow-xl group-hover:block group-focus-within:block">
              <p className="mb-2 font-label-md text-label-md text-on-background">
                {tooltipDateFormatter.format(day.date)}
              </p>
              {day.events.length > 0 ? (
                <ul className="space-y-2">
                  {day.events.map((event) => (
                    <li key={event.id}>{renderEvent ? renderEvent(event) : <DefaultCalendarEvent event={event} />}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-body-sm text-on-surface-variant">No meetings scheduled.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CalendarLegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function DefaultCalendarEvent({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex gap-2 text-body-sm text-on-surface-variant">
      {event.time ? <span className="font-label-sm text-label-sm text-primary">{event.time}</span> : null}
      <span className="min-w-0 flex-1">{event.title}</span>
    </div>
  );
}

function getAccessibleLabel(date: Date, events: readonly CalendarEvent[]) {
  if (events.length === 0) {
    return `${accessibleDateFormatter.format(date)}: no meetings`;
  }

  return `${accessibleDateFormatter.format(date)}: ${events
    .map((event) => [event.time, event.title].filter(Boolean).join(" "))
    .join(", ")}`;
}
