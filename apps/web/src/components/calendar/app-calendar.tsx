import {
  Calendar,
  type CalendarEvent,
  type CalendarProps,
} from "@interviews-tracker/design-system";
import type { ReactNode } from "react";
import { useCalendarNavigation } from "./use-calendar-navigation";

export type AppCalendarProps<Event extends CalendarEvent = CalendarEvent> =
  Omit<
    CalendarProps<Event>,
    "month" | "onPreviousMonth" | "onNextMonth" | "onToday"
  > & {
    initialMonth?: Date;
  };

type AppCalendarEvent = CalendarEvent & {
  isFuture?: boolean;
};

export function AppCalendar<Event extends CalendarEvent = CalendarEvent>({
  initialMonth,
  renderEvent,
  ...calendarProps
}: AppCalendarProps<Event>) {
  const navigation = useCalendarNavigation(initialMonth);

  return (
    <Calendar
      {...calendarProps}
      renderEvent={
        renderEvent ??
        ((event) => renderAppCalendarEvent(event as AppCalendarEvent))
      }
      month={navigation.month}
      onPreviousMonth={navigation.onPreviousMonth}
      onNextMonth={navigation.onNextMonth}
      onToday={navigation.onToday}
    />
  );
}

function renderAppCalendarEvent(event: AppCalendarEvent): ReactNode {
  return (
    <div
      className={`rounded-lg border px-2 py-2 text-left ${
        event.isFuture
          ? "border-primary/20 bg-primary/5"
          : "border-outline-variant/60 bg-surface-container-low/40"
      }`}
    >
      <div className="mb-1 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 font-label-sm text-[11px] uppercase tracking-wider ${
            event.isFuture
              ? "bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface-variant"
          }`}
        >
          {event.isFuture ? "Upcoming" : "Meeting"}
        </span>
        {event.time ? (
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {event.time}
          </span>
        ) : null}
      </div>
      <div
        className={`text-body-sm ${
          event.isFuture ? "text-primary" : "text-on-surface-variant"
        }`}
      >
        {event.title}
      </div>
    </div>
  );
}
