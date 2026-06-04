import type { ReactNode } from "react";
import { pipelineTone, priorityTone, statusTone, titleize } from "../lib/format";

const colors: Record<string, string> = {
  active: "bg-secondary-container text-on-secondary-container",
  potential: "bg-surface-container-low text-on-surface-variant",
  green: "bg-primary-fixed text-on-primary-fixed-variant",
  blue: "bg-surface-container-high text-on-surface-variant",
  violet: "bg-tertiary-fixed text-on-tertiary-fixed-variant",
  red: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-highest text-on-surface-variant",
  muted: "bg-surface-container-highest text-on-surface-variant",
  warning: "bg-tertiary-fixed text-on-tertiary-fixed-variant"
};

export function Badge({ value, children, tone }: { value: string; children?: ReactNode; tone?: keyof typeof colors }) {
  const inferred = tone ?? (["ACTIVE_PROCESS", "POTENTIAL", "ARCHIVED"].includes(value) ? pipelineTone(value) : ["HIGH", "MEDIUM", "LOW", "MAYBE"].includes(value) ? priorityTone(value) : statusTone(value));
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 font-label-md text-label-md ${colors[inferred] ?? colors.neutral}`}>{children ?? titleize(value)}</span>;
}
