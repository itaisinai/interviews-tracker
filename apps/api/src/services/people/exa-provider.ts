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
    const experience: Array<{ company: string; title: string; dates?: string; duration?: string }> = [];
    const education: Array<{ institution: string; degree?: string; dates?: string }> = [];
    const skills: string[] = [];

    let inAboutSection = false;
    let inExperienceSection = false;
    let inEducationSection = false;
    let inSkillsSection = false;
    let currentExperience: { company?: string; title?: string; dates?: string; duration?: string } | null = null;
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
            experience.push(currentExperience as { company: string; title: string; dates?: string; duration?: string });
          }

          // New experience entry - title line
          currentExperience = { title: line.replace(/^###\s*/, "").trim() };
        } else if (currentExperience && !currentExperience.company && !line.startsWith("#")) {
          // Company name (usually follows title)
          currentExperience.company = line;
        } else if (currentExperience && line.includes("·") && !currentExperience.dates) {
          // Dates and duration line
          const parts = line.split("·");
          currentExperience.dates = parts[0]?.trim();
          currentExperience.duration = parts[1]?.trim();
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
        // Skills can be: bullet points, comma-separated, or pipe-separated
        const skillLine = line.replace(/^[•\-\*]\s*/, "");

        // Split by common delimiters
        const splitSkills = skillLine.split(/[•·|,]\s*/).filter(s => s.trim().length > 0);

        if (splitSkills.length > 1) {
          // Multiple skills on one line
          skills.push(...splitSkills);
        } else if (skillLine.trim()) {
          // Single skill
          skills.push(skillLine.trim());
        }
      }
    }

    // Save last experience/education if any
    if (currentExperience?.company && currentExperience?.title) {
      experience.push(currentExperience as { company: string; title: string; dates?: string; duration?: string });
    }
    if (currentEducation?.institution) {
      education.push(currentEducation as { institution: string; degree?: string; dates?: string });
    }

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
        experience: experience.length > 0 ? experience : undefined,
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
