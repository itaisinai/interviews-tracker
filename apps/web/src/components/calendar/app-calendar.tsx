import {
  Calendar,
  type CalendarEvent,
  type CalendarProps,
} from "@interviews-tracker/design-system";
import { useCalendarNavigation } from "./use-calendar-navigation";

export type AppCalendarProps<Event extends CalendarEvent = CalendarEvent> =
  Omit<
    CalendarProps<Event>,
    "month" | "onPreviousMonth" | "onNextMonth" | "onToday"
  > & {
    initialMonth?: Date;
  };

export function AppCalendar<Event extends CalendarEvent = CalendarEvent>({
  initialMonth,
  ...calendarProps
}: AppCalendarProps<Event>) {
  const navigation = useCalendarNavigation(initialMonth);

  return (
    <Calendar
      {...calendarProps}
      month={navigation.month}
      onPreviousMonth={navigation.onPreviousMonth}
      onNextMonth={navigation.onNextMonth}
      onToday={navigation.onToday}
    />
  );
}
