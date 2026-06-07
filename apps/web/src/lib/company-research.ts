export type CompanyResearchRunState =
  | "idle"
  | "searching_web"
  | "reading_sources"
  | "extracting_facts"
  | "completed"
  | "failed";

export const companyResearchRunMeta: Record<CompanyResearchRunState, { label: string; description: string; tone: "neutral" | "busy" | "success" | "danger" }> = {
  idle: {
    label: "Ready",
    description: "Click research to gather missing company details from the web.",
    tone: "neutral"
  },
  searching_web: {
    label: "Searching web",
    description: "Looking for reliable company and funding sources.",
    tone: "busy"
  },
  reading_sources: {
    label: "Reading sources",
    description: "Reviewing the most relevant pages and snippets.",
    tone: "busy"
  },
  extracting_facts: {
    label: "Extracting facts",
    description: "Turning evidence into structured CRM fields.",
    tone: "busy"
  },
  completed: {
    label: "Ready for review",
    description: "The research result is ready to inspect before saving.",
    tone: "success"
  },
  failed: {
    label: "Research failed",
    description: "The research run could not complete. You can retry without losing context.",
    tone: "danger"
  }
};

export type CompanyResearchLogStatus = "pending" | "active" | "done" | "error";

export const companyResearchLogTone: Record<CompanyResearchLogStatus, { dot: string; text: string; ring?: string }> = {
  pending: { dot: "bg-outline", text: "text-on-surface-variant" },
  active: { dot: "bg-secondary", text: "text-on-background", ring: "ring-2 ring-secondary/20" },
  done: { dot: "bg-primary", text: "text-on-background" },
  error: { dot: "bg-error", text: "text-on-error-container" }
};

export const companyResearchStepMessages = [
  "Checking existing company data",
  "Searching web for funding rounds",
  "Reading sources",
  "Extracting structured company research",
  "Ready for review"
] as const;
