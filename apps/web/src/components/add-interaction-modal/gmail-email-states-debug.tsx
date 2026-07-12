import type { GmailMessageStates, TrackedGmailEmail } from "../gmail-interaction-panel/gmail-interaction-panel-helpers";

type GmailEmailStatesDebugProps = {
  messageStates?: GmailMessageStates;
  onUnpick: (messageId: string) => void;
  onRestore: (messageId: string) => void;
  isUnpickPending: boolean;
  isRestorePending: boolean;
  compact?: boolean;
};

export function GmailEmailStatesDebug({
  messageStates,
  onUnpick,
  onRestore,
  isUnpickPending,
  isRestorePending,
  compact = false,
}: GmailEmailStatesDebugProps) {
  if (!messageStates || (messageStates.pickedEmails.length === 0 && messageStates.removedEmails.length === 0)) {
    return null;
  }

  const total = messageStates.pickedEmails.length + messageStates.removedEmails.length;

  return (
    <div className={`border-t border-neutral-200 ${compact ? "pt-4 mt-4" : "pt-6"}`}>
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-neutral-600 hover:text-neutral-900">
          {compact ? `Debug: Picked/Cleared emails (${total})` : `Debug: Show picked/cleared emails (${total} total)`}
        </summary>
        <div className={compact ? "mt-3 space-y-3" : "mt-4 space-y-4"}>
          <EmailStateList
            emails={messageStates.pickedEmails}
            title={compact ? "Picked" : "Picked Emails"}
            tone="picked"
            pending={isUnpickPending}
            actionLabel="Undo"
            onAction={onUnpick}
            compact={compact}
          />
          <EmailStateList
            emails={messageStates.removedEmails}
            title={compact ? "Cleared" : "Cleared Emails"}
            tone="removed"
            pending={isRestorePending}
            actionLabel="Restore"
            onAction={onRestore}
            compact={compact}
          />
        </div>
      </details>
    </div>
  );
}

type EmailStateListProps = {
  emails: TrackedGmailEmail[];
  title: string;
  tone: "picked" | "removed";
  pending: boolean;
  actionLabel: string;
  onAction: (messageId: string) => void;
  compact: boolean;
};

function EmailStateList({ emails, title, tone, pending, actionLabel, onAction, compact }: EmailStateListProps) {
  if (emails.length === 0) {
    return null;
  }

  const picked = tone === "picked";
  const headingClass = picked ? "text-emerald-600" : "text-neutral-500";
  const dateClass = picked ? (compact ? "text-emerald-600" : "text-emerald-700") : "text-neutral-500";
  const cardClass = compact
    ? `flex items-start justify-between gap-2 rounded border ${picked ? "border-emerald-200 bg-emerald-50" : "border-neutral-200 bg-neutral-50"} p-2`
    : `flex items-start justify-between gap-2 rounded-lg border ${picked ? "border-emerald-200 bg-emerald-50/50" : "border-neutral-200 bg-neutral-50"} p-3 text-xs`;
  const buttonClass = compact
    ? `flex-shrink-0 rounded px-2 py-1 text-xs font-medium ${picked ? "text-emerald-700 hover:bg-emerald-100" : "text-neutral-700 hover:bg-neutral-100"} disabled:opacity-50`
    : `flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${picked ? "text-emerald-700 hover:bg-emerald-100" : "text-neutral-700 hover:bg-neutral-100"} disabled:opacity-50`;

  return (
    <div>
      <div className={`mb-2 text-xs font-semibold uppercase ${headingClass}`}>
        {title} ({emails.length})
      </div>
      <div className="space-y-2">
        {emails.map((email) => (
          <div key={email.id} className={cardClass}>
            <div className="flex-1 min-w-0 text-xs">
              <div
                className={`font-medium truncate ${!compact && picked ? "text-emerald-900" : !compact ? "text-neutral-700" : ""}`}
              >
                {email.subject}
              </div>
              <div className={compact ? dateClass : `mt-1 ${dateClass}`}>
                {compact ? email.date : new Date(email.date).toLocaleDateString()}
              </div>
            </div>
            <button type="button" onClick={() => onAction(email.id)} disabled={pending} className={buttonClass}>
              {pending ? "..." : actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
