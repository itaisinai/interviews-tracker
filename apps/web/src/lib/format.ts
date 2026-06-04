import type { JobStatus, PipelineType, Priority } from "./types";

export function titleize(value?: string | null) {
  if (!value) return "-";
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function initials(name: string) {
  return name
    .split(/\s|\//)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function statusTone(status: JobStatus | string) {
  if (status === "PHONE_SCHEDULED" || status === "PHONE_DONE" || status === "TECHNICAL_SCHEDULED" || status === "TECHNICAL_DONE" || status === "OFFER") return "green";
  if (status === "REJECTED" || status === "NOT_RELEVANT") return "muted";
  if (status === "HOME_ASSIGNMENT" || status === "ASSIGNMENT_SUBMITTED" || status === "FINAL_STAGE") return "violet";
  return "blue";
}

export function priorityTone(priority: Priority | string) {
  if (priority === "HIGH") return "red";
  if (priority === "MEDIUM") return "neutral";
  if (priority === "MAYBE") return "violet";
  return "muted";
}

export function pipelineTone(pipeline: PipelineType | string) {
  if (pipeline === "ACTIVE_PROCESS") return "active";
  if (pipeline === "ARCHIVED") return "muted";
  return "potential";
}
