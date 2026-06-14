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

  const fourth = calendar.days[3];

  assert.equal(calendar.monthLabel, "July 2026");
  assert.equal(calendar.totalEvents, 2);
  assert.deepEqual(
    fourth.events.map((event) => event.id),
    ["early", "late"],
  );
  assert.equal(fourth.tone, "multiple");
});

test("calendar event tone matches empty, single, and multiple states", () => {
  assert.equal(getCalendarEventTone(0), "empty");
  assert.equal(getCalendarEventTone(1), "single");
  assert.equal(getCalendarEventTone(2), "multiple");
});
