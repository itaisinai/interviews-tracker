import test from "node:test";
import assert from "node:assert/strict";
import { appendSlugCollisionSuffix, createOpportunitySlug } from "@interviews-tracker/core";

test("opportunity slug collision handling uses incrementing suffixes", () => {
  const base = createOpportunitySlug("Alta", "Senior Software Engineer");
  const used = new Set([base, appendSlugCollisionSuffix(base, 2)]);

  let candidate = base;
  for (let index = 1; used.has(candidate); index += 1) {
    candidate = appendSlugCollisionSuffix(base, index + 1);
  }

  assert.equal(candidate, "alta-senior-software-engineer-3");
});

test("opportunity lookup contract checks id before slug", () => {
  const slugOrId = "cmq3yid5p00005w0xi5mozmh9";
  const lookupOrder = [{ id: slugOrId }, { slug: slugOrId }];

  assert.deepEqual(lookupOrder, [{ id: slugOrId }, { slug: slugOrId }]);
});
