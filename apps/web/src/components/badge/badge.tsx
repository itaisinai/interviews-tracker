import type { ReactNode } from "react";
import {
  Badge as DesignBadge,
  type BadgeTone,
} from "@interviews-tracker/design-system";
import {
  displayLabelForEnumValue,
  offerStatusLabels,
  pipelineTypeLabels,
  priorityLabels,
  taskStatusLabels,
  interactionStatusLabels,
  jobStatusLabels,
} from "../../lib/enum-labels";
import { pipelineTone, priorityTone, statusTone } from "../../lib/format";

type BadgeProps = {
  value?: string | null;
  children?: ReactNode;
  tone?: BadgeTone;
  className?: string;
};

function toneForValue(value?: string | null): BadgeTone | undefined {
  if (!value) {
    return undefined;
  }

  if (value in priorityLabels) {
    return priorityTone(value);
  }

  if (value in pipelineTypeLabels) {
    const tone = pipelineTone(value);
    if (tone === "active") {
      return "green";
    }
    if (tone === "potential") {
      return "blue";
    }
    return tone;
  }

  if (
    value in jobStatusLabels ||
    value in taskStatusLabels ||
    value in interactionStatusLabels
  ) {
    return statusTone(value);
  }

  if (value in offerStatusLabels) {
    if (
      value === "ACCEPTED" ||
      value === "VERBAL_OFFER" ||
      value === "WRITTEN_OFFER"
    ) {
      return "green";
    }

    if (value === "DECLINED") {
      return "red";
    }

    return "violet";
  }

  return undefined;
}

export function Badge({ value, children, tone, className }: BadgeProps) {
  const content = children ?? displayLabelForEnumValue(value ?? "") ?? value ?? "";
  const resolvedTone = tone ?? toneForValue(value);

  return (
    <DesignBadge tone={resolvedTone} className={className}>
      {content}
    </DesignBadge>
  );
}

export type { BadgeTone };
