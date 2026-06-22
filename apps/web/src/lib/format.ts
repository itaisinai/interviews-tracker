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

export function formatDateTimeRange(
  startValue?: string | null,
  endValue?: string | null,
  referenceDate: Date = new Date(),
) {
  if (!startValue) return "-";

  const startDate = new Date(startValue);
  const formattedDate = startDate.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
  const startTime = startDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  if (!endValue) {
    return `${formattedDate}, ${startTime}`;
  }

  const endDate = new Date(endValue);
  const endTime = endDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });

  // Calculate duration
  const totalMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
  let durationText = "";

  if (totalMinutes < 60) {
    durationText = `${totalMinutes} minutes`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (minutes === 0) {
      durationText = hours === 1 ? "1 hour" : `${hours} hours`;
    } else {
      durationText = `${hours}.${Math.round(minutes / 6)} hours`;
    }
  }

  return `${formattedDate}, ${startTime} - ${endTime}. ${durationText}`;
}

export function statusTone(status: JobStatus | string) {
  if (status === "DONE") return "green";
  if (status === "REJECTED") return "rose";
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

export function formatDurationBetween(startValue: string, endValue?: string | null) {
  if (!endValue) {
    return null;
  }

  const start = new Date(startValue).getTime();
  const end = new Date(endValue).getTime();
  const totalMinutes = Math.round((end - start) / 60_000);

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return null;
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} minute${totalMinutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;

  if (minutes === 0) {
    return hourLabel;
  }

  return `${hourLabel} ${minutes} minute${minutes === 1 ? "" : "s"}`;
}
