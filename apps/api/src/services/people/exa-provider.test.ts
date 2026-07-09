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
