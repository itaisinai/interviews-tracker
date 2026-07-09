import assert from "node:assert/strict";
import test from "node:test";

import { displayLabelForEnumValue } from "./enum-labels.js";

test("does not mislabel arbitrary values as interview", () => {
  assert.equal(displayLabelForEnumValue("NEW"), null);
  assert.equal(displayLabelForEnumValue("UPDATED"), null);
});

test("keeps legacy interaction labels human-friendly", () => {
  assert.equal(displayLabelForEnumValue("Phone Interview"), "Phone Call");
  assert.equal(displayLabelForEnumValue("Interview"), "Interview");
});
