import assert from "node:assert/strict";
import test from "node:test";
import { createMonthCalendar, getCalendarEventTone } from "./calendar-utils.js";

test("calendar groups events into the requested month and sorts by time", () => {
  const calendar = createMonthCalendar({
    month: new Date(2026, 6, 1),
    events: [
      { id: "outside", date: new Date(2026, 7, 1, 9), title: "Outside" },
      { id: "late", date: new Date(2026, 6, 4, 16), title: "Late" },
      { id: "early", date: new Date(2026, 6, 4, 9), title: "Early" },
    ],
  });

  const fourth = calendar.days.find((day) => day.key === "2026-07-04");

  assert.equal(calendar.monthLabel, "July 2026");
  assert.equal(calendar.totalEvents, 2);
  assert.deepEqual(
    fourth?.events.map((event) => event.id),
    ["early", "late"],
  );
  assert.equal(fourth?.tone, "multiple");
});

test("calendar event tone matches empty, single, and multiple states", () => {
  assert.equal(getCalendarEventTone(0), "empty");
  assert.equal(getCalendarEventTone(1), "single");
  assert.equal(getCalendarEventTone(2), "multiple");
});

test("calendar marks the provided today date", () => {
  const today = new Date(2026, 6, 14);
  const calendar = createMonthCalendar({
    month: new Date(2026, 6, 1),
    today,
    events: [],
  });

  assert.equal(calendar.days.find((day) => day.key === "2026-07-14")?.isToday, true);
  assert.equal(calendar.days.find((day) => day.key === "2026-07-13")?.isToday, false);
});

test("calendar fills leading and trailing weeks with adjacent month days", () => {
  const calendar = createMonthCalendar({
    month: new Date(2026, 5, 1),
    today: new Date(2026, 5, 25),
    events: [],
  });

  assert.equal(calendar.days.length, 35);
  assert.equal(calendar.days[0].key, "2026-05-31");
  assert.equal(calendar.days[0].isCurrentMonth, false);
  assert.equal(calendar.days[1].key, "2026-06-01");
  assert.equal(calendar.days[1].isCurrentMonth, true);
  assert.equal(calendar.days.at(-1)?.key, "2026-07-04");
  assert.equal(calendar.days.at(-1)?.isCurrentMonth, false);
});

test("calendar only counts events from the requested month in the month total", () => {
  const calendar = createMonthCalendar({
    month: new Date(2026, 5, 1),
    events: [
      { id: "previous", date: new Date(2026, 4, 31, 9), title: "Previous" },
      { id: "current", date: new Date(2026, 5, 1, 9), title: "Current" },
      { id: "next", date: new Date(2026, 6, 4, 9), title: "Next" },
    ],
  });

  assert.equal(calendar.totalEvents, 1);
  assert.equal(calendar.days[0].events[0]?.id, "previous");
  assert.equal(calendar.days.at(-1)?.events[0]?.id, "next");
});

test("calendar preserves final week days across daylight saving time", () => {
  const calendar = createMonthCalendar({
    month: new Date(2026, 2, 1),
    events: [
      {
        id: "last-visible-day",
        date: new Date(2026, 3, 4, 9),
        title: "Last visible day",
      },
    ],
  });

  assert.equal(calendar.days.length, 35);
  assert.equal(calendar.days.at(-1)?.key, "2026-04-04");
  assert.equal(calendar.days.at(-1)?.events[0]?.id, "last-visible-day");
});
