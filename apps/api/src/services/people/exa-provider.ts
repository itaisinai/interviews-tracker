import type { PersonResearchResult } from "./person-research-service.js";

type ExaSearchResult = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id: string;
  text?: string; // Present when contents.text is requested
};

type ExaSearchResponse = {
  results: ExaSearchResult[];
  requestId?: string;
  searchType?: string;
};

type ExaContentsResponse = {
  results: Array<{
    id: string;
    url: string;
    title: string;
    text?: string;
  }>;
};

function stripMarkdownLink(value: string): string {
  return value.match(/^\[([^\]]+)\]/)?.[1] || value;
}

function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function positionIsCurrent(dates?: string): boolean {
  return /(?:^|[-–—\s])present\b/i.test(dates || "");
}

function parseExperienceDateLine(line: string): { dates: string; duration?: string } | null {
  // Updated regex to handle location suffix (e.g., "in Tel Aviv District, Israel")
  // Removed trailing $ and made duration capture more flexible
  const dateMatch = line.match(
    /([A-Z][a-z]{2}\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2}\s+\d{4}|Present)(?:\s*[·•]?\s*\(([^)]+)\))?/
  );

  if (!dateMatch) {
    return null;
  }

  return {
    dates: `${dateMatch[1]} - ${dateMatch[2]}`,
    duration: dateMatch[3]?.trim(),
  };
}

function parseCompanyLine(line: string): string {
  return stripMarkdownLink(line).split(/[·•]/)[0]?.trim() || "";
}

function currentCompanyFromExperience(
  experience: NonNullable<PersonResearchResult["research"]["experience"]>
): string | undefined {
  const currentExperience = experience.find((exp) =>
    exp.positions.some((position) => positionIsCurrent(position.dates))
  );
  return currentExperience?.company || experience[0]?.company;
}

function currentTitleFromExperience(
  experience: NonNullable<PersonResearchResult["research"]["experience"]>
): string | undefined {
  const currentExperience =
    experience.find((exp) => exp.positions.some((position) => positionIsCurrent(position.dates))) || experience[0];
  return (
    currentExperience?.positions.find((position) => positionIsCurrent(position.dates))?.title ||
    currentExperience?.positions[0]?.title
  );
}

export class PersonResearchProviderError extends Error {
  readonly code = "PERSON_RESEARCH_PROVIDER_ERROR";
  readonly statusCode = 503;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PersonResearchProviderError";
  }
}

export class ExaProvider {
  private apiKey: string;
  private baseUrl = "https://api.exa.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchLinkedInProfile(name: string, companyName?: string): Promise<{ url: string; text: string } | null> {
    // Use Exa's people category with text content in a single call
    const query = companyName ? `${name} from ${companyName}` : name;

    console.log("[EXA] Query:", query);

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          query,
          type: "auto",
          category: "people",
          numResults: 5,
          includeDomains: ["linkedin.com"],
          contents: {
            text: {
              includeHtmlTags: false,
              maxCharacters: 20000,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Exa search failed:", response.status, errorBody);
        throw new PersonResearchProviderError(`Exa LinkedIn profile search failed with status ${response.status}`);
      }

      const data = (await response.json()) as ExaSearchResponse;

      // Filter for profile pages (not posts or other LinkedIn pages)
      const linkedInResults = data.results.filter(
        (r) => r.url.includes("linkedin.com/in/") && !r.url.includes("/posts/")
      );

      if (linkedInResults.length === 0) {
        return null;
      }

      const result = linkedInResults[0];
      // @ts-ignore - text field exists when contents.text is requested
      const text = result.text;

      if (!text) {
        console.error("No text content returned from Exa");
        throw new PersonResearchProviderError("Exa LinkedIn profile search returned a result without profile text");
      }

      return {
        url: result.url,
        text,
      };
    } catch (error) {
      if (error instanceof PersonResearchProviderError) {
        throw error;
      }

      console.error("Exa search error:", error);
      throw new PersonResearchProviderError("Exa LinkedIn profile search failed", { cause: error });
    }
  }

  parseLinkedInContent(content: string, name: string, linkedInUrl: string): PersonResearchResult {
    console.log("[EXA PARSE] ======== START PARSING ========");
    console.log("[EXA PARSE] LinkedIn URL:", linkedInUrl);
    console.log("[EXA PARSE] Search name:", name);
    console.log("[EXA PARSE] Content length:", content.length, "chars");
    console.log("[EXA PARSE] First 500 chars:", content.substring(0, 500));
    console.log("[EXA PARSE] ======== FULL CONTENT ========");
    console.log(content);
    console.log("[EXA PARSE] ======== END FULL CONTENT ========");

    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    console.log("[EXA PARSE] Total lines after trim:", lines.length);

    // Extract actual name from first line (LinkedIn profiles start with the person's name)
    let actualName = name; // fallback to search name
    if (lines.length > 0) {
      const firstLine = lines[0];
      // First line is usually the person's name, unless it's a heading marker
      if (!firstLine.startsWith("#") && !firstLine.match(/^(About|Experience|Education|Contact)/i)) {
        actualName = firstLine;
      }
    }
    console.log("[EXA PARSE] Extracted name:", actualName);

    let title = "";
    let company = "";
    const rawExperience: Array<{
      company: string;
      companyUrl?: string;
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }> = [];
    const education: Array<{ institution: string; degree?: string; dates?: string }> = [];

    let inExperienceSection = false;
    let inEducationSection = false;
    let currentExperience: {
      company?: string;
      companyUrl?: string;
      title?: string;
      dates?: string;
      duration?: string;
      description?: string;
    } | null = null;
    let currentEducation: { institution?: string; degree?: string; dates?: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      // Detect sections
      if (line.match(/^(?:#+\s*)?Experience$/i)) {
        inExperienceSection = true;
        inEducationSection = false;
        continue;
      }

      if (line.match(/^(?:#+\s*)?Education$/i)) {
        inExperienceSection = false;
        inEducationSection = true;
        continue;
      }

      // Exit both sections if we hit any other major section
      if (
        line.match(
          /^(?:#+\s*)?(About|Skills|Licenses|Certifications|Volunteer|Projects|Publications|Honors|Languages)$/i
        )
      ) {
        inExperienceSection = false;
        inEducationSection = false;
        continue;
      }

      // Extract title and company from top lines
      if (i < 10 && line.includes(" at ") && !title) {
        const parts = line.split(" at ");
        title = parts[0]?.trim() || "";
        company = parts[1]?.trim() || "";
      }

      // Parse Experience section
      if (inExperienceSection) {
        console.log("[EXA PARSE] Processing experience line:", line);

        // IMPORTANT: Check for #### BEFORE ### because startsWith("###") matches both!
        if (line.startsWith("####")) {
          console.log("[EXA PARSE] Found sub-position (####)");
          // Sub-position under a company - save previous position first
          if (currentExperience?.company && currentExperience?.title) {
            console.log("[EXA PARSE] Saving previous sub-position:", currentExperience);
            rawExperience.push(
              currentExperience as {
                company: string;
                companyUrl?: string;
                title: string;
                dates?: string;
                duration?: string;
                description?: string;
              }
            );
          }

          // Start new position under the same company
          const positionTitle = line.replace(/^####\s*/, "").trim();
          currentExperience = {
            // @ts-ignore
            company: currentExperience?.company || "",
            // @ts-ignore
            companyUrl: currentExperience?.companyUrl,
            title: positionTitle,
          };
          console.log("[EXA PARSE] Started new sub-position:", currentExperience);
        } else if (line.startsWith("###")) {
          console.log("[EXA PARSE] Found company/position header (###)");
          // Save previous experience
          if (currentExperience?.company && currentExperience?.title) {
            rawExperience.push(
              currentExperience as {
                company: string;
                companyUrl?: string;
                title: string;
                dates?: string;
                duration?: string;
                description?: string;
              }
            );
          }

          const rawLine = line.replace(/^###\s*/, "").trim();

          // Check if this line contains " at " - indicates single position
          if (rawLine.includes(" at ")) {
            // Format: ### Title at [Company](url)
            const atMatch = rawLine.match(/^(.+?)\s+at\s+\[([^\]]+)\]\(([^)]+)\)/);
            if (atMatch) {
              currentExperience = {
                title: atMatch[1].trim(),
                company: atMatch[2],
                companyUrl: atMatch[3],
              };
            } else {
              // Fallback for plain text without markdown link
              const parts = rawLine.split(" at ");
              currentExperience = {
                title: parts[0]?.trim() || "",
                company: parts[1]?.trim() || "",
              };
            }
          } else {
            // Format: ### [Company](url) - multiple positions will follow as ####
            const companyMatch = rawLine.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (companyMatch) {
              currentExperience = {
                company: companyMatch[1],
                companyUrl: companyMatch[2],
                title: "", // Will be filled by #### lines
              };
            } else {
              // Just company name without link
              currentExperience = {
                company: rawLine,
                title: "",
              };
            }
          }
        } else if (!line.startsWith("#")) {
          // Skip Department/Level metadata lines
          if (line.startsWith("Department:")) {
            continue;
          }

          // Plain LinkedIn format detection: if no currentExperience and line looks like a title
          // (not a date, not location, not a metadata line)
          if (!currentExperience) {
            // Check if this might be a plain title line (before we have company info)
            // It should be substantial text without special patterns that indicate metadata
            const isLikelyTitle =
              line.length > 5 &&
              !line.match(/^\w{3}\s+\d{4}/) && // Not a date like "Jun 2026"
              !line.includes(" · ") && // Not a company/metadata line with dots
              !line.match(/^[A-Z][a-z]+,/) && // Not a location like "Tel Aviv,"
              !line.includes("District") && // Not location
              !line.includes("@"); // Not email/handle

            if (isLikelyTitle) {
              // Start new experience with title, company will come next
              console.log("[EXA PARSE] Found plain title line:", line);
              currentExperience = {
                title: line.trim(),
                company: "",
              };
              continue;
            }
            continue;
          }

          // If we have a title but no company yet, check if this is the company line
          if (currentExperience.title && !currentExperience.company && line.includes(" · ")) {
            const companyParts = line.split(" · ");
            currentExperience.company = companyParts[0]?.trim() || "";
            console.log("[EXA PARSE] Found plain company line:", currentExperience.company);
            continue;
          }

          // Look for dates with format: "Month Year - Month Year (duration)" or just location info
          if (!currentExperience.dates) {
            const dateLine = parseExperienceDateLine(line);
            if (dateLine) {
              console.log("[EXA PARSE] Found date line:", line, "→ parsed:", dateLine);
              currentExperience.dates = dateLine.dates;
              currentExperience.duration = dateLine.duration;
            } else {
              console.log("[EXA PARSE] Line did not match date pattern:", line);
            }
          }
          // Description text (after we have dates, skip metadata and short lines)
          else if (currentExperience.dates && !line.startsWith("@") && line.length > 50) {
            if (!currentExperience.description) {
              currentExperience.description = line;
            } else {
              currentExperience.description += " " + line;
            }
          }
        }
      }

      // Parse Education section
      if (inEducationSection) {
        if (line.startsWith("###")) {
          // Save previous education
          if (currentEducation?.institution && currentEducation?.degree) {
            education.push(currentEducation as { institution: string; degree?: string; dates?: string });
          }

          // Format: ### Degree at [Institution](url)
          const rawLine = line.replace(/^###\s*/, "").trim();

          if (rawLine.includes(" at ")) {
            const atMatch = rawLine.match(/^(.+?)\s+at\s+\[([^\]]+)\]\(([^)]+)\)/);
            if (atMatch) {
              currentEducation = {
                institution: atMatch[2],
                degree: atMatch[1].trim(),
              };
            } else {
              // Fallback for plain text without markdown link
              const parts = rawLine.split(" at ");
              currentEducation = {
                institution: parts[1]?.trim() || "",
                degree: parts[0]?.trim() || "",
              };
            }
          } else {
            // Old format or just institution name
            const institutionMatch = rawLine.match(/^\[([^\]]+)\]/);
            currentEducation = {
              institution: institutionMatch ? institutionMatch[1] : rawLine,
            };
          }
        } else if (currentEducation && !currentEducation.dates && !line.startsWith("#")) {
          // Dates line - only capture lines with actual years (format: YYYY - YYYY)
          const dateMatch = line.match(/\d{4}\s*[-–]\s*\d{4}|\d{4}\s*[-–]\s*Present/);
          if (dateMatch) {
            currentEducation.dates = line.split(" in ")[0].trim(); // Remove location suffix
          }
        }
        // Skip everything else (descriptions, locations, etc.)
      }
    }

    // Save last experience/education if any
    if (currentExperience?.company && currentExperience?.title) {
      console.log("[EXA PARSE] Saving final experience:", currentExperience);
      rawExperience.push(
        currentExperience as {
          company: string;
          companyUrl?: string;
          title: string;
          dates?: string;
          duration?: string;
          description?: string;
        }
      );
    }
    if (currentEducation?.institution && currentEducation?.degree) {
      education.push(currentEducation as { institution: string; degree?: string; dates?: string });
    }

    console.log("[EXA PARSE] ======== RAW EXPERIENCE ========");
    console.log("[EXA PARSE] Total experiences:", rawExperience.length);
    rawExperience.forEach((exp, idx) => {
      console.log(`[EXA PARSE] [${idx}] Company: ${exp.company}`);
      console.log(`[EXA PARSE] [${idx}] Title: ${exp.title}`);
      console.log(`[EXA PARSE] [${idx}] Dates: ${exp.dates || "NO DATES"}`);
      console.log(`[EXA PARSE] [${idx}] Duration: ${exp.duration || "NO DURATION"}`);
    });

    // Clean up markdown artifacts from company names and titles
    const cleanedExperience = rawExperience.map((exp) => {
      // Remove markdown syntax from company names: "### Title at [Company](url)" or "[Company](url)"
      let cleanCompany = exp.company;
      let cleanCompanyUrl = exp.companyUrl;

      // Extract from markdown link if present: [Company](url)
      const linkMatch = cleanCompany.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        cleanCompany = linkMatch[1];
        cleanCompanyUrl = cleanCompanyUrl || linkMatch[2];
      }

      // Remove ### prefix if it somehow got through
      cleanCompany = cleanCompany.replace(/^###\s*/, "").trim();

      // Remove "Title at " prefix if the full line got captured as company name
      const atMatch = cleanCompany.match(/^(.+?)\s+at\s+(.+)$/);
      if (atMatch && !exp.title) {
        // This means "Title at Company" was captured as company, split it
        return {
          ...exp,
          title: atMatch[1].trim(),
          company: atMatch[2].trim(),
          companyUrl: cleanCompanyUrl,
        };
      }

      return {
        ...exp,
        company: cleanCompany,
        companyUrl: cleanCompanyUrl,
      };
    });

    // Group experiences by company
    const groupedExperience = cleanedExperience.reduce(
      (acc, exp) => {
        const existing = acc.find((g) => g.company === exp.company);
        if (existing) {
          existing.positions.push({
            title: exp.title,
            dates: exp.dates,
            duration: exp.duration,
            description: exp.description,
          });
        } else {
          acc.push({
            company: exp.company,
            companyUrl: exp.companyUrl,
            totalDuration: exp.duration, // First position's duration (will be updated if multiple)
            positions: [
              {
                title: exp.title,
                dates: exp.dates,
                duration: exp.duration,
                description: exp.description,
              },
            ],
          });
        }
        return acc;
      },
      [] as Array<{
        company: string;
        companyUrl?: string;
        totalDuration?: string;
        positions: Array<{
          title: string;
          dates?: string;
          duration?: string;
          description?: string;
        }>;
      }>
    );

    const currentCompany = groupedExperience.length > 0 ? currentCompanyFromExperience(groupedExperience) : undefined;
    const currentTitle = groupedExperience.length > 0 ? currentTitleFromExperience(groupedExperience) : undefined;

    console.log("[EXA PARSE] ======== GROUPED EXPERIENCE ========");
    groupedExperience.forEach((group, idx) => {
      console.log(`[EXA PARSE] Company [${idx}]: ${group.company}`);
      group.positions.forEach((pos, posIdx) => {
        console.log(`[EXA PARSE]   Position [${posIdx}]: ${pos.title}`);
        console.log(`[EXA PARSE]   Dates: ${pos.dates || "NO DATES"}`);
        console.log(`[EXA PARSE]   Duration: ${pos.duration || "NO DURATION"}`);
      });
    });
    console.log("[EXA PARSE] ======== END PARSING ========");

    return {
      person: {
        name: actualName,
        title: currentTitle || title || undefined,
        company: currentCompany || company || undefined,
        linkedinUrl: linkedInUrl,
        avatarUrl: undefined,
      },
      research: {
        experience: groupedExperience.length > 0 ? groupedExperience : undefined,
        education: education.length > 0 ? education : undefined,
        sources: [
          {
            label: "LinkedIn Profile",
            url: linkedInUrl,
          },
        ],
      },
    };
  }

  async researchPerson(name: string, companyName?: string, linkedinUrl?: string): Promise<PersonResearchResult | null> {
    let profileData: { url: string; text: string } | null = null;

    if (linkedinUrl) {
      // If we have a LinkedIn URL, fetch its content directly using the old /contents endpoint
      // This is necessary because /search requires a query, not a URL
      try {
        const response = await fetch(`${this.baseUrl}/contents`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
          },
          body: JSON.stringify({
            ids: [linkedinUrl],
            text: {
              includeHtmlTags: false,
              maxCharacters: 20000,
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Exa contents failed:", response.status, errorBody);
          throw new PersonResearchProviderError(
            `Exa LinkedIn profile content fetch failed with status ${response.status}`
          );
        }

        const data = (await response.json()) as ExaContentsResponse;
        const result = data.results[0];
        if (result?.text) {
          profileData = { url: linkedinUrl, text: result.text };
        } else {
          console.error("No LinkedIn profile text returned from Exa contents");
          throw new PersonResearchProviderError("Exa LinkedIn profile content fetch returned no profile text");
        }
      } catch (error) {
        if (error instanceof PersonResearchProviderError) {
          throw error;
        }

        console.error("Error fetching LinkedIn content:", error);
        throw new PersonResearchProviderError("Exa LinkedIn profile content fetch failed", { cause: error });
      }
    }

    if (!profileData) {
      profileData = await this.searchLinkedInProfile(name, companyName);
    }

    if (!profileData) {
      return null;
    }

    const result = this.parseLinkedInContent(profileData.text, name, profileData.url);

    // Simple validation: just check we have a result
    if (!result.person.company) {
      console.log(`[Company validation] Warning - no company found in LinkedIn profile, allowing result`);
    }

    return result;
  }
}
