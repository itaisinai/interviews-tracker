export type CalendarEvent = {
  id: string;
  date: Date | string;
  title: string;
  time?: string;
};

export type CalendarEventTone = "empty" | "single" | "multiple";

export type CalendarDay<Event extends CalendarEvent = CalendarEvent> = {
  key: string;
  date: Date;
  events: Event[];
  tone: CalendarEventTone;
  isToday: boolean;
};

export type CalendarMonth<Event extends CalendarEvent = CalendarEvent> = {
  monthLabel: string;
  leadingBlankDays: number;
  days: Array<CalendarDay<Event>>;
  totalEvents: number;
};

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  year: "numeric",
});

export function createMonthCalendar<Event extends CalendarEvent>({
  events,
  month,
  today = new Date(),
}: {
  events: readonly Event[];
  month: Date;
  today?: Date;
}): CalendarMonth<Event> {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const endOfMonth = new Date(
    monthEnd.getFullYear(),
    monthEnd.getMonth(),
    monthEnd.getDate(),
    23,
    59,
    59,
    999,
  );
  const eventsByDay = new Map<string, Event[]>();

  for (const event of events) {
    const eventDate = new Date(event.date);

    if (eventDate < monthStart || eventDate > endOfMonth) {
      continue;
    }

    const key = formatCalendarDateKey(eventDate);
    const dayEvents = eventsByDay.get(key) ?? [];
    dayEvents.push(event);
    eventsByDay.set(key, dayEvents);
  }

  const days = Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1);
    const key = formatCalendarDateKey(date);
    const dayEvents = [...(eventsByDay.get(key) ?? [])].sort(
      (left, right) => new Date(left.date).getTime() - new Date(right.date).getTime(),
    );

    return {
      key,
      date,
      events: dayEvents,
      tone: getCalendarEventTone(dayEvents.length),
      isToday: isSameCalendarDate(date, today),
    };
  });

  return {
    monthLabel: monthFormatter.format(monthStart),
    leadingBlankDays: monthStart.getDay(),
    days,
    totalEvents: days.reduce((total, day) => total + day.events.length, 0),
  };
}

export function getCalendarEventTone(eventCount: number): CalendarEventTone {
  if (eventCount > 1) return "multiple";
  if (eventCount === 1) return "single";
  return "empty";
}

export function formatCalendarDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function isSameCalendarDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}
