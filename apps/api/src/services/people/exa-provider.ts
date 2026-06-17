import type { PersonResearchInput, PersonResearchResult } from "./person-research-service.js";

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

export class ExaProvider {
  private apiKey: string;
  private baseUrl = "https://api.exa.ai";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchLinkedInProfile(name: string, companyName?: string): Promise<{ url: string; text: string } | null> {
    // Use Exa's people category with text content in a single call
    const query = companyName
      ? `${name} from ${companyName}`
      : name;

    try {
      const response = await fetch(`${this.baseUrl}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
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
              maxCharacters: 20000
            }
          }
        })
      });

      if (!response.ok) {
        console.error("Exa search failed:", response.status, await response.text());
        return null;
      }

      const data = await response.json() as ExaSearchResponse;

      // Filter for profile pages (not posts or other LinkedIn pages)
      const linkedInResults = data.results.filter(r =>
        r.url.includes("linkedin.com/in/") && !r.url.includes("/posts/")
      );

      if (linkedInResults.length === 0) {
        return null;
      }

      const result = linkedInResults[0];
      // @ts-ignore - text field exists when contents.text is requested
      const text = result.text;

      if (!text) {
        console.error("No text content returned from Exa");
        return null;
      }

      return {
        url: result.url,
        text
      };
    } catch (error) {
      console.error("Exa search error:", error);
      return null;
    }
  }

  parseLinkedInContent(content: string, name: string, linkedInUrl: string): PersonResearchResult {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

    let title = "";
    let company = "";
    const rawExperience: Array<{ company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string }> = [];
    const education: Array<{ institution: string; degree?: string; dates?: string }> = [];

    let inExperienceSection = false;
    let inEducationSection = false;
    let currentExperience: { company?: string; companyUrl?: string; title?: string; dates?: string; duration?: string; description?: string } | null = null;
    let currentEducation: { institution?: string; degree?: string; dates?: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      // Detect sections
      if (line.match(/^#+\s*Experience/i)) {
        inExperienceSection = true;
        inEducationSection = false;
        continue;
      }

      if (line.match(/^#+\s*Education/i)) {
        inExperienceSection = false;
        inEducationSection = true;
        continue;
      }

      // Exit both sections if we hit any other major section
      if (line.match(/^#+\s*(About|Skills|Licenses|Certifications|Volunteer|Projects|Publications|Honors|Languages)/i)) {
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
        // IMPORTANT: Check for #### BEFORE ### because startsWith("###") matches both!
        if (line.startsWith("####")) {
          // Sub-position under a company - save previous position first
          if (currentExperience?.company && currentExperience?.title) {
            rawExperience.push(currentExperience as { company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string });
          }

          // Start new position under the same company
          const positionTitle = line.replace(/^####\s*/, "").trim();
          currentExperience = {
            // @ts-ignore
            company: currentExperience?.company || "",
            // @ts-ignore
            companyUrl: currentExperience?.companyUrl,
            title: positionTitle
          };
        } else if (line.startsWith("###")) {
          // Save previous experience
          if (currentExperience?.company && currentExperience?.title) {
            rawExperience.push(currentExperience as { company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string });
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
                companyUrl: atMatch[3]
              };
            } else {
              // Fallback for plain text without markdown link
              const parts = rawLine.split(" at ");
              currentExperience = {
                title: parts[0]?.trim() || "",
                company: parts[1]?.trim() || ""
              };
            }
          } else {
            // Format: ### [Company](url) - multiple positions will follow as ####
            const companyMatch = rawLine.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
            if (companyMatch) {
              currentExperience = {
                company: companyMatch[1],
                companyUrl: companyMatch[2],
                title: "" // Will be filled by #### lines
              };
            } else {
              // Just company name without link
              currentExperience = {
                company: rawLine,
                title: ""
              };
            }
          }
        } else if (currentExperience && !line.startsWith("#")) {
          // Skip Department/Level metadata lines
          if (line.startsWith("Department:")) {
            continue;
          }

          // Look for dates with format: "Month Year - Month Year (duration)" or just location info
          if (!currentExperience.dates) {
            const dateMatch = line.match(/([A-Z][a-z]{2}\s+\d{4})\s*-\s*([A-Z][a-z]{2}\s+\d{4}|Present)\s*\(([^)]+)\)/);
            if (dateMatch) {
              currentExperience.dates = `${dateMatch[1]} - ${dateMatch[2]}`;
              currentExperience.duration = dateMatch[3].trim();
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
                degree: atMatch[1].trim()
              };
            } else {
              // Fallback for plain text without markdown link
              const parts = rawLine.split(" at ");
              currentEducation = {
                institution: parts[1]?.trim() || "",
                degree: parts[0]?.trim() || ""
              };
            }
          } else {
            // Old format or just institution name
            const institutionMatch = rawLine.match(/^\[([^\]]+)\]/);
            currentEducation = {
              institution: institutionMatch ? institutionMatch[1] : rawLine
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
      rawExperience.push(currentExperience as { company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string });
    }
    if (currentEducation?.institution && currentEducation?.degree) {
      education.push(currentEducation as { institution: string; degree?: string; dates?: string });
    }

    // Group experiences by company
    const groupedExperience = rawExperience.reduce((acc, exp) => {
      const existing = acc.find((g) => g.company === exp.company);
      if (existing) {
        existing.positions.push({
          title: exp.title,
          dates: exp.dates,
          duration: exp.duration,
          description: exp.description
        });
      } else {
        acc.push({
          company: exp.company,
          companyUrl: exp.companyUrl,
          totalDuration: exp.duration, // First position's duration (will be updated if multiple)
          positions: [{
            title: exp.title,
            dates: exp.dates,
            duration: exp.duration,
            description: exp.description
          }]
        });
      }
      return acc;
    }, [] as Array<{
      company: string;
      companyUrl?: string;
      totalDuration?: string;
      positions: Array<{
        title: string;
        dates?: string;
        duration?: string;
        description?: string;
      }>;
    }>);

    return {
      person: {
        name,
        title: title || undefined,
        company: company || undefined,
        linkedinUrl: linkedInUrl,
        avatarUrl: undefined
      },
      research: {
        // @ts-ignore
        experience: groupedExperience.length > 0 ? groupedExperience : undefined,
        education: education.length > 0 ? education : undefined,
        sources: [
          {
            label: "LinkedIn Profile",
            url: linkedInUrl
          }
        ]
      }
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
            "x-api-key": this.apiKey
          },
          body: JSON.stringify({
            ids: [linkedinUrl],
            text: {
              includeHtmlTags: false,
              maxCharacters: 20000
            }
          })
        });

        if (response.ok) {
          const data = await response.json() as ExaContentsResponse;
          const result = data.results[0];
          if (result?.text) {
            profileData = { url: linkedinUrl, text: result.text };
          }
        }
      } catch (error) {
        console.error("Error fetching LinkedIn content:", error);
      }
    }

    if (!profileData) {
      profileData = await this.searchLinkedInProfile(name, companyName);
    }

    if (!profileData) {
      return null;
    }

    const result = this.parseLinkedInContent(profileData.text, name, profileData.url);

    return result;
  }
}
