import { MaterialIcon } from "@interviews-tracker/design-system";

import type { GmailSearchCandidate } from "../../lib/types";

type GmailEmailListItemProps = {
  email: {
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet?: string;
    relevance?: {
      isRelevant: boolean;
    };
  };
  isSelected?: boolean;
  onToggle?: () => void;
  onRemove?: () => void;
  showRelevanceLabel?: boolean;
  disabled?: boolean;
};

export function GmailEmailListItem({
  email,
  isSelected = false,
  onToggle,
  onRemove,
  showRelevanceLabel = true,
  disabled = false,
}: GmailEmailListItemProps) {
  const isRelevant = email.relevance?.isRelevant;
  const isInteractive = onToggle || onRemove;

  const content = (
    <>
      {/* Checkbox (only for selectable items) */}
      {onToggle && (
        <div
          className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ${
            isSelected ? "border-blue-500 bg-blue-500" : "border-neutral-300"
          }`}
        >
          {isSelected && <MaterialIcon name="check" className="text-[14px] text-white" />}
        </div>
      )}

      {/* Email info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-medium text-sm text-neutral-900 truncate">{email.subject || "No subject"}</div>
          {showRelevanceLabel && isRelevant && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium flex-shrink-0">
              <MaterialIcon name="check_circle" className="text-[12px]" />
              Relevant
            </span>
          )}
        </div>
        <div className="text-xs text-neutral-500 mb-1">From: {email.from}</div>
        <div className="text-xs text-neutral-400">
          {new Date(email.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        {email.snippet && <div className="text-xs text-neutral-500 mt-2 line-clamp-2">{email.snippet}</div>}
      </div>

      {/* Remove button (only for removable items) */}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors disabled:opacity-50"
          title="Remove email"
        >
          <MaterialIcon name="close" className="text-[16px]" />
        </button>
      )}
    </>
  );

  if (isInteractive && onToggle) {
    return (
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-neutral-200 hover:bg-neutral-50"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors">
      {content}
    </div>
  );
}
