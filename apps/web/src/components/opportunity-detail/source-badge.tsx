import type { OpportunitySource } from "@interviews-tracker/core";
import { MaterialIcon } from "@interviews-tracker/design-system";

interface SourceBadgeProps {
  source: OpportunitySource | null | undefined;
}

const SOURCE_CONFIG: Record<
  OpportunitySource,
  {
    label: string;
    icon: string;
    className: string;
  }
> = {
  GMAIL: {
    label: "Gmail",
    icon: "mail",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  TELEGRAM: {
    label: "Telegram",
    icon: "send",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  LINKEDIN: {
    label: "LinkedIn",
    icon: "work",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MANUAL: {
    label: "Manual",
    icon: "edit",
    className: "bg-gray-50 text-gray-700 border-gray-200",
  },
  API: {
    label: "API",
    icon: "code",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  CHATBOT: {
    label: "Chatbot",
    icon: "chat",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  OTHER: {
    label: "Other",
    icon: "more_horiz",
    className: "bg-gray-50 text-gray-700 border-gray-200",
  },
};

export function SourceBadge({ source }: SourceBadgeProps) {
  if (!source) {
    return null;
  }

  const config = SOURCE_CONFIG[source];

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
      title={`Source: ${config.label}`}
    >
      <MaterialIcon name={config.icon} className="text-[14px]" />
      <span>{config.label}</span>
    </div>
  );
}
