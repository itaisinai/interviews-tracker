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
          useAutoprompt: true, // Exa's AI improves the search query
          type: "neural" // Semantic search
        })
      });

      if (!response.ok) {
        console.error("Exa search failed:", response.status, await response.text());
        return null;
      }

      const data = await response.json() as ExaSearchResponse;

      // Find the best matching LinkedIn profile
      const linkedInResults = data.results.filter(r =>
        r.url.includes("linkedin.com/in/") && !r.url.includes("/posts/")
      );

      if (linkedInResults.length === 0) {
        return null;
      }

      // Return the top result
      return linkedInResults[0].url;
    } catch (error) {
      console.error("Exa search error:", error);
      return null;
    }
  }

  async getLinkedInContent(url: string): Promise<ExaContentsResponse["results"][0] | null> {
    // Get the content/text from the LinkedIn page
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
    // Simple parsing of LinkedIn content
    // LinkedIn content from Exa typically includes the structured text
    const lines = content.split("\n").map(l => l.trim()).filter(Boolean);

    // Extract basic info - LinkedIn profiles usually have: Name, Headline, About, Experience, Education, Skills
    let currentRole = "";
    let currentCompany = "";
    let about = "";
    const experience: Array<{ company: string; title: string; dates?: string; duration?: string }> = [];
    const education: Array<{ institution: string; degree?: string; dates?: string }> = [];
    const skills: string[] = [];

    // Simple heuristics to parse the content
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Try to extract current role (usually near the top)
      if (i < 5 && line.includes("·") && !currentRole) {
        currentRole = line;
      }

      // Look for company names (often in all caps or after "at")
      if (line.match(/\bat\b/i) && !currentCompany) {
        currentCompany = line.split(/\bat\b/i)[1]?.trim() || "";
      }
    }

    // Create minimal research result
    // Note: This is basic parsing. Exa's content is usually well-structured
    return {
      person: {
        name,
        title: currentRole || undefined,
        company: currentCompany || undefined,
        linkedinUrl: linkedInUrl,
        avatarUrl: undefined
      },
      research: {
        about: content.substring(0, 300) + (content.length > 300 ? "..." : ""), // First 300 chars as summary
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
    // Step 1: Find LinkedIn profile if not provided
    let profileUrl = linkedinUrl || await this.searchLinkedInProfile(name, companyName);

    if (!profileUrl) {
      return null;
    }

    // Step 2: Get LinkedIn content from Exa
    const contentResult = await this.getLinkedInContent(profileUrl);

    if (!contentResult || !contentResult.text) {
      return null;
    }

    // Step 3: Parse the LinkedIn content
    const result = this.parseLinkedInContent(contentResult.text, name, profileUrl);

    return result;
  }
}
