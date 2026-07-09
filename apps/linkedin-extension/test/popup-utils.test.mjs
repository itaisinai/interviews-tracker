import test from "node:test";
import assert from "node:assert/strict";
import { buildAuthHeaders, getDetectedJobRows, hasUsefulJobContent } from "../src/popup-utils.js";

test("hasUsefulJobContent accepts title, company, description, or raw text", () => {
  assert.equal(hasUsefulJobContent({}), false);
  assert.equal(hasUsefulJobContent({ title: "Engineer" }), true);
  assert.equal(hasUsefulJobContent({ companyName: "Acme" }), true);
  assert.equal(hasUsefulJobContent({ descriptionText: "Build things" }), true);
  assert.equal(hasUsefulJobContent({ rawText: "Visible job text" }), true);
});

test("getDetectedJobRows marks missing detected job fields", () => {
  const rows = getDetectedJobRows({ title: "Engineer", linkedinJobId: "123" });
  assert.deepEqual(
    rows.map((row) => row.value || row.missingText),
    ["Engineer", "Missing company", "Missing location", "ID: 123"]
  );
});

test("buildAuthHeaders includes bearer token only when provided", () => {
  assert.deepEqual(buildAuthHeaders(""), { "Content-Type": "application/json" });
  assert.deepEqual(buildAuthHeaders("abc123"), { "Content-Type": "application/json", Authorization: "Bearer abc123" });
});
