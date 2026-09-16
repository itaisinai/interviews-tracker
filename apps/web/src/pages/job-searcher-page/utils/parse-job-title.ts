/**
 * Client-side parsing of job titles for immediate display
 * Provides instant feedback while AI parsing happens in background
 */
export function parseJobTitleLocal(title: string): { jobTitle: string; companyName: string } | null {
  if (!title) return null;

  // Remove LinkedIn suffix
  const cleaned = title
    .replace(/\s+LinkedIn$/i, "")
    .replace(/\s+\|\s+LinkedIn$/i, "")
    .replace(/\s+-\s+LinkedIn$/i, "")
    .trim();

  // Pattern: "Company hiring Job Title (details)"
  // Example: "FullStack hiring Senior Full Stack Engineer (Python + JavaScript)"
  const hiringPattern = /^(.+?)\s+hiring\s+(.+?)(?:\s+\(|$)/i;
  const hiringMatch = cleaned.match(hiringPattern);
  if (hiringMatch) {
    return {
      jobTitle: hiringMatch[2].trim(),
      companyName: hiringMatch[1].trim(),
    };
  }

  // Pattern: "Job Title | Company Location"
  const pipePattern = /^(.+?)\s+\|\s+(.+?)(?:\s+[A-Z][a-z]+(?:,|\s|$))/;
  const pipeMatch = cleaned.match(pipePattern);
  if (pipeMatch) {
    const jobTitle = pipeMatch[1].trim();
    const rest = pipeMatch[2].trim();
    // Extract first word(s) as company before location
    const companyMatch = rest.match(/^([^\s]+(?:\s+[^\s]+)?)/);
    if (companyMatch) {
      return {
        jobTitle,
        companyName: companyMatch[1].trim(),
      };
    }
  }

  // Pattern: "Company — Location" or "Job Title - Company"
  const dashPattern = /^(.+?)\s+[—–-]\s+(.+?)$/;
  const dashMatch = cleaned.match(dashPattern);
  if (dashMatch) {
    const [, part1, part2] = dashMatch;
    // If first part has job keywords, it's the job title
    if (part1.match(/senior|junior|engineer|developer|full.?stack|backend|frontend/i)) {
      return {
        jobTitle: part1.trim(),
        companyName: part2.trim(),
      };
    }
    // Otherwise first part is company
    if (!part1.match(/\s/) || part1.length < 30) {
      return {
        jobTitle: cleaned,
        companyName: part1.trim(),
      };
    }
  }

  return null;
}

export function formatJobTitle(
  title: string,
  companyName?: string,
  parsed?: { jobTitle: string; companyName: string } | null
): string {
  // Use AI-parsed if available
  if (parsed?.jobTitle && parsed?.companyName) {
    return `${parsed.jobTitle} at ${parsed.companyName}`;
  }

  // Try local parsing
  const localParsed = parseJobTitleLocal(title);
  if (localParsed) {
    return `${localParsed.jobTitle} at ${localParsed.companyName}`;
  }

  // Fallback to provided company name
  if (companyName && companyName !== "Unknown Company") {
    // Try to extract just the job title from the raw title
    const simplified = title
      .replace(/\s+LinkedIn$/i, "")
      .replace(/\s+hiring\s+/i, " - ")
      .replace(/\s+\|.*$/i, "")
      .trim();
    return `${simplified} at ${companyName}`;
  }

  // Last resort: return original title
  return title;
}
