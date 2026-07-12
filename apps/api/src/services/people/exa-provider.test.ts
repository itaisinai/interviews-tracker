import assert from "node:assert/strict";
import test from "node:test";

import { ExaProvider } from "./exa-provider.js";

const linkedinUrl = "https://www.linkedin.com/in/idobenzaken/";

test("parseLinkedInContent uses the present experience as the current company", () => {
  const provider = new ExaProvider("test-key");

  const result = provider.parseLinkedInContent(
    `
# Ido Ben Zaken
Team Lead at Element Security

## Experience
### Software Engineering Team Lead at [Unframe](https://www.linkedin.com/company/unframe/)
Jun 2026 - Present (1 mo)
Tel Aviv District, Israel · On-site

### [Element Security](https://www.linkedin.com/company/element-security/)
#### Team Lead
Aug 2024 - May 2026 (1 yr 10 mos)
Tel Aviv District, Israel
#### Full-stack Developer
Oct 2022 - Aug 2024 (1 yr 11 mos)
Tel Aviv, Israel
`,
    "Ido Ben Zaken",
    linkedinUrl
  );

  assert.equal(result.person.company, "Unframe");
  assert.equal(result.person.title, "Software Engineering Team Lead");
});

test("parseLinkedInContent handles plain LinkedIn experience text without markdown headings", () => {
  const provider = new ExaProvider("test-key");

  const result = provider.parseLinkedInContent(
    `
Ido Ben Zaken
Team Lead at Element Security

Experience
Software Engineering Team Lead
Unframe · Full-time
Jun 2026 - Present · 1 mo
Tel Aviv District, Israel · On-site

Element Security
Full-time · 3 yrs 8 mos
Hybrid
Team Lead
Aug 2024 - May 2026 · 1 yr 10 mos
Tel Aviv District, Israel
Full-stack Developer
Oct 2022 - Aug 2024 · 1 yr 11 mos
Tel Aviv, Israel
`,
    "Ido Ben Zaken",
    linkedinUrl
  );

  assert.equal(result.person.company, "Unframe");
  assert.equal(result.person.title, "Software Engineering Team Lead");
});

test("parseLinkedInContent handles dash-separated format: Title - [Company](url)", () => {
  const provider = new ExaProvider("test-key");

  const result = provider.parseLinkedInContent(
    `
# John Doe

## Experience
### Software Engineer - [Acme Corp](https://www.linkedin.com/company/acme/)
Jan 2024 - Present (6 mos)
San Francisco, CA
`,
    "John Doe",
    "https://www.linkedin.com/in/johndoe/"
  );

  assert.equal(result.person.company, "Acme Corp");
  assert.equal(result.person.title, "Software Engineer");
  assert.equal(result.research.experience?.length, 1);
  assert.equal(result.research.experience?.[0].company, "Acme Corp");
  assert.equal(result.research.experience?.[0].positions[0].title, "Software Engineer");
});

test("parseLinkedInContent handles multiple dashes in title", () => {
  const provider = new ExaProvider("test-key");

  const result = provider.parseLinkedInContent(
    `
# Jane Smith

## Experience
### Senior Engineering Manager - AI Cloud Security - [CrowdStrike](https://www.linkedin.com/company/crowdstrike/)
Mar 2023 - Present (1 yr 4 mos)
Remote
`,
    "Jane Smith",
    "https://www.linkedin.com/in/janesmith/"
  );

  assert.equal(result.person.company, "CrowdStrike");
  assert.equal(result.person.title, "Senior Engineering Manager - AI Cloud Security");
  assert.equal(result.research.experience?.length, 1);
  assert.equal(result.research.experience?.[0].company, "CrowdStrike");
  assert.equal(result.research.experience?.[0].positions[0].title, "Senior Engineering Manager - AI Cloud Security");
});

test("parseLinkedInContent handles plain text dash format without markdown", () => {
  const provider = new ExaProvider("test-key");

  const result = provider.parseLinkedInContent(
    `
# Bob Johnson

## Experience
### Product Manager - TechCo
Jun 2022 - Dec 2023 (1 yr 7 mos)
Boston, MA
`,
    "Bob Johnson",
    "https://www.linkedin.com/in/bobjohnson/"
  );

  assert.equal(result.person.company, "TechCo");
  assert.equal(result.person.title, "Product Manager");
  assert.equal(result.research.experience?.length, 1);
  assert.equal(result.research.experience?.[0].company, "TechCo");
  assert.equal(result.research.experience?.[0].positions[0].title, "Product Manager");
});
