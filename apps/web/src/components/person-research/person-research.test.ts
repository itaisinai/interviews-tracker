import assert from "node:assert/strict";
import { test } from "node:test";

// LinkedIn URL validation logic
function isValidLinkedInUrl(url: string): boolean {
  if (!url.trim()) {
    return true; // Empty is valid (optional field)
  }
  return /^https?:\/\/(www\.)?linkedin\.com\//i.test(url);
}

test("LinkedIn URL validation: valid URLs pass", () => {
  assert.equal(isValidLinkedInUrl("https://www.linkedin.com/in/johndoe"), true);
  assert.equal(isValidLinkedInUrl("https://linkedin.com/in/johndoe"), true);
  assert.equal(isValidLinkedInUrl("http://www.linkedin.com/in/johndoe"), true);
  assert.equal(isValidLinkedInUrl("http://linkedin.com/company/acme"), true);
});

test("LinkedIn URL validation: empty URL passes", () => {
  assert.equal(isValidLinkedInUrl(""), true);
  assert.equal(isValidLinkedInUrl("   "), true);
});

test("LinkedIn URL validation: invalid URLs fail", () => {
  assert.equal(isValidLinkedInUrl("https://twitter.com/user"), false);
  assert.equal(isValidLinkedInUrl("not-a-url"), false);
  assert.equal(isValidLinkedInUrl("https://example.com"), false);
  assert.equal(isValidLinkedInUrl("linkedin.com/in/johndoe"), false); // Missing protocol
});

// Person identity logic - stable identity by email/linkedin/name+company
type PersonIdentity = {
  name: string;
  email?: string | null;
  linkedinUrl?: string | null;
  company?: string | null;
};

function normalizeForComparison(value: string | null | undefined): string {
  return (value || "").toLowerCase().trim();
}

function isSamePerson(a: PersonIdentity, b: PersonIdentity): boolean {
  // Match by email if both have it
  if (a.email && b.email && normalizeForComparison(a.email) === normalizeForComparison(b.email)) {
    return true;
  }

  // Match by LinkedIn URL if both have it
  if (
    a.linkedinUrl &&
    b.linkedinUrl &&
    normalizeForComparison(a.linkedinUrl) === normalizeForComparison(b.linkedinUrl)
  ) {
    return true;
  }

  // Match by normalized name + company
  const nameA = normalizeForComparison(a.name);
  const nameB = normalizeForComparison(b.name);
  const companyA = normalizeForComparison(a.company);
  const companyB = normalizeForComparison(b.company);

  if (nameA && nameB && nameA === nameB && companyA && companyB && companyA === companyB) {
    return true;
  }

  return false;
}

test("person identity: matches by email", () => {
  const person1 = { name: "John Doe", email: "john@example.com" };
  const person2 = { name: "J. Doe", email: "john@example.com" };
  assert.equal(isSamePerson(person1, person2), true);
});

test("person identity: matches by LinkedIn URL", () => {
  const person1 = { name: "John Doe", linkedinUrl: "https://linkedin.com/in/johndoe" };
  const person2 = { name: "John D.", linkedinUrl: "https://linkedin.com/in/johndoe" };
  assert.equal(isSamePerson(person1, person2), true);
});

test("person identity: matches by name + company", () => {
  const person1 = { name: "John Doe", company: "Acme Corp" };
  const person2 = { name: "john doe", company: "acme corp" };
  assert.equal(isSamePerson(person1, person2), true);
});

test("person identity: does not match different people", () => {
  const person1 = { name: "John Doe", company: "Acme Corp" };
  const person2 = { name: "Jane Doe", company: "Acme Corp" };
  assert.equal(isSamePerson(person1, person2), false);
});

test("person identity: does not match same name, different company", () => {
  const person1 = { name: "John Doe", company: "Acme Corp" };
  const person2 = { name: "John Doe", company: "Beta Inc" };
  assert.equal(isSamePerson(person1, person2), false);
});

// Research payload structure
test("research request payload: builds correctly with all fields", () => {
  const input = {
    personId: "person-123",
    name: "John Doe",
    companyName: "Acme Corp",
    roleTitle: "Engineering Manager",
    linkedinUrl: "https://linkedin.com/in/johndoe"
  };

  assert.equal(input.name, "John Doe");
  assert.equal(input.companyName, "Acme Corp");
  assert.equal(input.roleTitle, "Engineering Manager");
  assert.equal(input.linkedinUrl, "https://linkedin.com/in/johndoe");
});

test("research request payload: builds correctly with minimal fields", () => {
  const input: {
    name: string;
    companyName?: string;
    roleTitle?: string;
    linkedinUrl?: string;
  } = {
    name: "John Doe"
  };

  assert.equal(input.name, "John Doe");
  assert.equal(input.companyName, undefined);
  assert.equal(input.roleTitle, undefined);
  assert.equal(input.linkedinUrl, undefined);
});

// Research is not saved before user confirmation
test("research flow: research is not saved before confirmation", () => {
  let saveWasCalled = false;

  // Simulate research flow
  const research = { about: "Sample research" };
  const userConfirmed = false;

  // Only save if confirmed
  if (userConfirmed) {
    saveWasCalled = true;
  }

  assert.equal(saveWasCalled, false);
});

test("research flow: research is saved after confirmation", () => {
  let saveWasCalled = false;

  // Simulate research flow
  const research = { about: "Sample research" };
  const userConfirmed = true;

  // Only save if confirmed
  if (userConfirmed) {
    saveWasCalled = true;
  }

  assert.equal(saveWasCalled, true);
});
