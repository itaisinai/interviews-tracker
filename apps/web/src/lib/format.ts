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

function isSameLocalDay(value: Date, reference = new Date()) {
  return (
    value.getFullYear() === reference.getFullYear() &&
    value.getMonth() === reference.getMonth() &&
    value.getDate() === reference.getDate()
  );
}

export function formatDate(
  value?: string | null,
  referenceDate: Date = new Date(),
) {
  if (!value) return "-";
  const date = new Date(value);
  const formatted = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return isSameLocalDay(date, referenceDate) ? `Today · ${formatted}` : formatted;
}

export function formatDateTime(
  value?: string | null,
  referenceDate: Date = new Date(),
) {
  if (!value) return "-";
  const date = new Date(value);
  const formattedDate = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const formattedTime = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
  return isSameLocalDay(date, referenceDate) ? `Today · ${formattedDate} · ${formattedTime}` : `${formattedDate} · ${formattedTime}`;
}

export function statusTone(status: JobStatus | string) {
  if (status === "DONE") return "green";
  if (status === "REJECTED") return "red";
  if (status === "SCHEDULED") return "blue";
  if (status === "CANCELLED") return "muted";
  if (status === "NEEDS_FOLLOW_UP") return "warning";
  if (status === "PHONE_SCHEDULED" || status === "PHONE_DONE" || status === "TECHNICAL_SCHEDULED" || status === "TECHNICAL_DONE" || status === "OFFER") return "green";
  if (status === "NOT_RELEVANT") return "muted";
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
