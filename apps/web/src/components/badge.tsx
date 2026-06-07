import type { ReactNode } from "react";
import { pipelineTone, priorityTone, statusTone, titleize } from "../lib/format";
import { displayLabelForEnumValue } from "../lib/enum-labels";

const colors: Record<string, string> = {
  active: "bg-[#2f7d57] text-white",
  potential: "bg-[#dfeaf4] text-[#365062]",
  green: "bg-[#2f7d57] text-white",
  blue: "bg-[#d9e3f7] text-[#365062]",
  violet: "bg-[#d7cef8] text-[#4e3e99]",
  red: "bg-[#f6ddd8] text-[#a64231]",
  neutral: "bg-[#e7ecef] text-[#43535d]",
  muted: "bg-[#e9eeec] text-[#43535d]",
  warning: "bg-[#f4e8d7] text-[#8a5d17]"
};

export function Badge({ value, children, tone }: { value: string; children?: ReactNode; tone?: keyof typeof colors }) {
  const inferred = tone ?? (["ACTIVE_PROCESS", "POTENTIAL", "ARCHIVED"].includes(value) ? pipelineTone(value) : ["HIGH", "MEDIUM", "LOW", "MAYBE"].includes(value) ? priorityTone(value) : statusTone(value));
  const display = children ?? displayLabelForEnumValue(value) ?? titleize(value);
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-label-md text-[11px] leading-none ${colors[inferred] ?? colors.neutral}`}>{display}</span>;
}
