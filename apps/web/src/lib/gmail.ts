export type GmailFlowState =
  | "idle"
  | "connecting_gmail"
  | "searching_emails"
  | "fetching_email"
  | "parsing_email"
  | "ready_for_review"
  | "failed";

export const gmailFlowMeta: Record<
  GmailFlowState,
  { label: string; description: string; tone: "neutral" | "busy" | "success" | "danger"; progress: number }
> = {
  idle: {
    label: "Ready",
    description: "Connect Gmail, search recent emails from this company, and turn one into an interaction.",
    tone: "neutral",
    progress: 0,
  },
  connecting_gmail: {
    label: "Connecting Gmail",
    description: "Opening Google's consent screen for read-only Gmail access.",
    tone: "busy",
    progress: 10,
  },
  searching_emails: {
    label: "Searching emails",
    description: "Looking for recent messages related to this opportunity.",
    tone: "busy",
    progress: 30,
  },
  fetching_email: {
    label: "Fetching email",
    description: "Loading the full email body for parsing.",
    tone: "busy",
    progress: 55,
  },
  parsing_email: {
    label: "Parsing email",
    description: "Extracting interaction fields with the AI parser.",
    tone: "busy",
    progress: 80,
  },
  ready_for_review: {
    label: "Ready for review",
    description: "Review the parsed interaction before saving it.",
    tone: "success",
    progress: 100,
  },
  failed: {
    label: "Flow failed",
    description: "The Gmail flow could not complete. You can retry without losing your selected email.",
    tone: "danger",
    progress: 100,
  },
};
