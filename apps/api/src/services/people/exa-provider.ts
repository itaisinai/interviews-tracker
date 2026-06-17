import type { PersonResearchInput, PersonResearchResult } from "./person-research-service.js";

type ExaSearchResult = {
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id: string;
};

type ExaSearchResponse = {
  results: ExaSearchResult[];
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

  async searchLinkedInProfile(name: string, companyName?: string): Promise<string | null> {
    // Use Exa's neural search with simple format: "NAME from COMPANY"
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
          numResults: 5,
          includeDomains: ["linkedin.com/in"],
          useAutoprompt: true,
          type: "neural"
        })
      });

      if (!response.ok) {
        console.error("Exa search failed:", response.status, await response.text());
        return null;
      }

      const data = await response.json() as ExaSearchResponse;

      const linkedInResults = data.results.filter(r =>
        r.url.includes("linkedin.com/in/") && !r.url.includes("/posts/")
      );

      if (linkedInResults.length === 0) {
        return null;
      }

      return linkedInResults[0].url;
    } catch (error) {
      console.error("Exa search error:", error);
      return null;
    }
  }

  async getLinkedInContent(url: string): Promise<ExaContentsResponse["results"][0] | null> {
    try {
      const response = await fetch(`${this.baseUrl}/contents`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey
        },
        body: JSON.stringify({
          ids: [url],
          text: {
            includeHtmlTags: false,
            maxCharacters: 5000
          }
        })
      });

      if (!response.ok) {
        console.error("Exa contents failed:", response.status);
        return null;
      }

      const data = await response.json() as ExaContentsResponse;
      return data.results[0] || null;
    } catch (error) {
      console.error("Exa contents error:", error);
      return null;
    }
  }

  parseLinkedInContent(content: string, name: string, linkedInUrl: string): PersonResearchResult {
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

    let title = "";
    let company = "";
    let about = "";
    const rawExperience: Array<{ company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string }> = [];
    const education: Array<{ institution: string; degree?: string; dates?: string }> = [];
    const skills: string[] = [];

    let inAboutSection = false;
    let inExperienceSection = false;
    let inEducationSection = false;
    let inSkillsSection = false;
    let currentExperience: { company?: string; companyUrl?: string; title?: string; dates?: string; duration?: string; description?: string } | null = null;
    let currentEducation: { institution?: string; degree?: string; dates?: string } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      // Detect sections
      if (line.match(/^#+\s*About/i)) {
        inAboutSection = true;
        inExperienceSection = false;
        inEducationSection = false;
        inSkillsSection = false;
        continue;
      }

      if (line.match(/^#+\s*Experience/i)) {
        inAboutSection = false;
        inExperienceSection = true;
        inEducationSection = false;
        inSkillsSection = false;
        continue;
      }

      if (line.match(/^#+\s*Education/i)) {
        inAboutSection = false;
        inExperienceSection = false;
        inEducationSection = true;
        inSkillsSection = false;
        continue;
      }

      if (line.match(/^#+\s*Skills/i)) {
        inAboutSection = false;
        inExperienceSection = false;
        inEducationSection = false;
        inSkillsSection = true;
        continue;
      }

      // Extract title and company from top lines
      if (i < 10 && line.includes(" at ") && !title) {
        const parts = line.split(" at ");
        title = parts[0]?.trim() || "";
        company = parts[1]?.trim() || "";
      }

      // Parse About section
      if (inAboutSection && !line.startsWith("#")) {
        about += (about ? " " : "") + line;
      }

      // Parse Experience section
      if (inExperienceSection) {
        if (line.startsWith("###")) {
          // Save previous experience
          if (currentExperience?.company && currentExperience?.title) {
            rawExperience.push(currentExperience as { company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string });
          }

          const rawLine = line.replace(/^###\s*/, "").trim();

          // Check if this is a company header (format: ### [Company](url)) or a job title
          const companyHeaderMatch = rawLine.match(/^\[([^\]]+)\]\(([^)]+)\)$/);

          if (companyHeaderMatch) {
            // This is a company header - positions will follow as ####
            currentExperience = {
              company: companyHeaderMatch[1],
              companyUrl: companyHeaderMatch[2],
              title: "" // Will be filled by #### lines
            };
          } else if (rawLine.includes(" at ")) {
            // Format: ### Title at [Company](url)
            const atMatch = rawLine.match(/^(.+?)\s+at\s+\[([^\]]+)\]\(([^)]+)\)/);
            if (atMatch) {
              currentExperience = {
                title: atMatch[1].trim(),
                company: atMatch[2],
                companyUrl: atMatch[3]
              };
            } else {
              currentExperience = { title: rawLine };
            }
          } else {
            // Simple format: ### Job Title (company info comes on next line)
            currentExperience = { title: rawLine };
          }
        } else if (line.startsWith("####")) {
          // Sub-position under a company
          if (currentExperience && currentExperience.company && !currentExperience.title) {
            currentExperience.title = line.replace(/^####\s*/, "").trim();
          }
        } else if (currentExperience && !line.startsWith("#")) {
          // Check if this is the company line (contains company name, often with | or · separators)
          if (!currentExperience.company && !line.startsWith("@") && !line.startsWith("Department:") && !line.match(/^[A-Z][a-z]{2}\s+\d{4}/)) {
            // Extract company name and URL if present
            const companyMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
            if (companyMatch) {
              currentExperience.company = companyMatch[1];
              currentExperience.companyUrl = companyMatch[2];
            } else {
              // Just company name (might have extra info like "· Full-time")
              const companyParts = line.split("·")[0].trim();
              currentExperience.company = companyParts;
            }
          }
          // Look for dates with format: "Month Year - Month Year (duration)" or "Month Year - Month Year · duration"
          else if (!currentExperience.dates) {
            const dateMatch = line.match(/([A-Z][a-z]{2}\s+\d{4})\s*-\s*([A-Z][a-z]{2}\s+\d{4}|Present)(?:\s*[·\(]\s*(.+?)[\)]?)?/);
            if (dateMatch) {
              currentExperience.dates = `${dateMatch[1]} - ${dateMatch[2]}`;
              if (dateMatch[3]) {
                currentExperience.duration = dateMatch[3].replace(/\)$/, "").trim();
              }
            }
          }
          // Skip location lines (single word countries/cities)
          else if (line.length < 30 && !line.includes(" ")) {
            // Skip location like "Israel"
          }
          // Description text (after we have dates, not metadata)
          else if (currentExperience.dates && !line.startsWith("@") && !line.startsWith("Department:") && line.length > 20) {
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
          if (currentEducation?.institution) {
            education.push(currentEducation as { institution: string; degree?: string; dates?: string });
          }

          // New education entry - institution name
          currentEducation = { institution: line.replace(/^###\s*/, "").trim() };
        } else if (currentEducation && !currentEducation.degree && !line.startsWith("#")) {
          // Degree line
          currentEducation.degree = line;
        } else if (currentEducation && !currentEducation.dates && !line.startsWith("#")) {
          // Dates line
          currentEducation.dates = line;
        }
      }

      // Parse Skills section
      if (inSkillsSection && !line.startsWith("#")) {
        // Skills are usually comma-separated or bullet points
        skills.push(line.replace(/^[•\-\*]\s*/, ""));
      }
    }

    // Save last experience/education if any
    if (currentExperience?.company && currentExperience?.title) {
      rawExperience.push(currentExperience as { company: string; companyUrl?: string; title: string; dates?: string; duration?: string; description?: string });
    }
    if (currentEducation?.institution) {
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
        about: about || undefined,
        experience: groupedExperience.length > 0 ? groupedExperience : undefined,
        education: education.length > 0 ? education : undefined,
        skills: skills.length > 0 ? skills : undefined,
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
    let profileUrl = linkedinUrl || await this.searchLinkedInProfile(name, companyName);

    if (!profileUrl) {
      return null;
    }

    const contentResult = await this.getLinkedInContent(profileUrl);

    if (!contentResult || !contentResult.text) {
      return null;
    }

    const result = this.parseLinkedInContent(contentResult.text, name, profileUrl);

    return result;
  }
}
