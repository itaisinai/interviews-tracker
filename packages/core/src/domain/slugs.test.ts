import test from "node:test";
import assert from "node:assert/strict";
import { appendSlugCollisionSuffix, createOpportunitySlug } from "./slugs.js";

test("creates readable opportunity slugs from company and role", () => {
  assert.equal(createOpportunitySlug("Alta", "Senior Software Engineer"), "alta-senior-software-engineer");
  assert.equal(createOpportunitySlug("  Mistral.AI  ", "Développeur Full-Stack!!!"), "mistral-ai-développeur-full-stack");
  assert.equal(createOpportunitySlug("東京", "エンジニア"), "東京-エンジニア");
  assert.equal(createOpportunitySlug("!!!", "***"), "opportunity");
});

test("appends collision suffixes predictably", () => {
  assert.equal(appendSlugCollisionSuffix("alta-senior-software-engineer", 1), "alta-senior-software-engineer");
  assert.equal(appendSlugCollisionSuffix("alta-senior-software-engineer", 2), "alta-senior-software-engineer-2");
  assert.equal(appendSlugCollisionSuffix("alta-senior-software-engineer", 3), "alta-senior-software-engineer-3");
});
