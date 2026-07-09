import assert from "node:assert/strict";
import { test } from "node:test";

import { applyParsedJobToTimeline } from "./parse-current-job-service.js";

test("does not mutate the current timeline when adjusting the previous job", () => {
  const currentExperience = [
    {
      company: "Previous Company",
      totalDuration: "2 years",
      positions: [
        {
          title: "Software Engineer",
          dates: "Jan 2024 - Present",
          duration: "2 years",
          description: "Built product features",
        },
      ],
    },
  ];
  const originalExperience = structuredClone(currentExperience);

  const updatedTimeline = applyParsedJobToTimeline(
    {
      currentJob: {
        company: "New Company",
        title: "Senior Software Engineer",
        startDate: "Jun 2026",
        description: "Lead product development",
      },
      adjustedPreviousJob: {
        company: "Previous Company",
        title: "Software Engineer",
        startDate: "Jan 2024",
        endDate: "May 2026",
      },
    },
    currentExperience
  );

  assert.deepEqual(currentExperience, originalExperience);
  assert.equal(updatedTimeline[1]?.positions[0]?.dates, "Jan 2024 - May 2026");
  assert.equal(updatedTimeline[1]?.positions[0]?.duration, undefined);
});
