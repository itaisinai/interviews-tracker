export type ParserRunState =
  | "idle"
  | "validating_input"
  | "sending_to_api"
  | "extracting_fields"
  | "normalizing_result"
  | "completed"
  | "failed";

export type ParserRunLogStatus = "pending" | "active" | "done" | "error";

export const parserRunStateMeta: Record<
  ParserRunState,
  { label: string; description: string; tone: "neutral" | "busy" | "success" | "danger" }
> = {
  idle: {
    label: "Ready",
    description: "Paste recruiter, job, or interview text to start extracting structured CRM data.",
    tone: "neutral",
  },
  validating_input: {
    label: "Validating input",
    description: "Checking that the pasted text is long enough and ready for parsing.",
    tone: "busy",
  },
  sending_to_api: {
    label: "Sending to API",
    description: "Submitting the text to the parser with the current Auth0 session.",
    tone: "busy",
  },
  extracting_fields: {
    label: "Extracting fields",
    description: "The AI is pulling out company, role, process, and signal details.",
    tone: "busy",
  },
  normalizing_result: {
    label: "Normalizing result",
    description: "The structured response is being cleaned up for review.",
    tone: "busy",
  },
  completed: {
    label: "Ready for review",
    description: "Parsing is complete and the structured CRM record is ready to inspect.",
    tone: "success",
  },
  failed: {
    label: "Parsing failed",
    description: "The parser could not complete this run. You can keep the input and retry.",
    tone: "danger",
  },
};

export const parserRunLogTone: Record<ParserRunLogStatus, { dot: string; text: string; ring?: string }> = {
  pending: { dot: "bg-outline", text: "text-on-surface-variant" },
  active: { dot: "bg-secondary", text: "text-on-background", ring: "ring-2 ring-secondary/20" },
  done: { dot: "bg-primary", text: "text-on-background" },
  error: { dot: "bg-error", text: "text-on-error-container" },
};
