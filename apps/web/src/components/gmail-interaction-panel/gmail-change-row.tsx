import type { ReactNode } from "react";

type ChangeRowProps = {
  icon: ReactNode;
  label: string;
  before?: string | null;
  after?: string | null;
  beforeEnd?: string | null;
  afterEnd?: string | null;
  changed: boolean;
  formatValue?: (value: string, endValue?: string | null) => string;
};

export function ChangeRow({ icon, label, before, after, beforeEnd, afterEnd, changed, formatValue }: ChangeRowProps) {
  const isNew = !before && after;
  const isUnchanged = !changed && !isNew;

  const displayBefore = before ? (formatValue ? formatValue(before, beforeEnd || null) : before) : "—";
  const displayAfter = after ? (formatValue ? formatValue(after, afterEnd || null) : after) : "—";

  return (
    <div
      className={`flex items-start gap-4 px-4 py-3 rounded-lg border transition-colors ${
        isNew
          ? "border-emerald-200 bg-emerald-50/50"
          : changed
            ? "border-blue-200 bg-blue-50/50"
            : "border-neutral-100 bg-neutral-50/30"
      }`}
    >
      <div className={`mt-0.5 ${isNew ? "text-emerald-600" : changed ? "text-blue-600" : "text-neutral-400"}`}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</span>
          {isNew && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-medium uppercase tracking-wide">
              New
            </span>
          )}
          {changed && !isNew && (
            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium uppercase tracking-wide">
              Changed
            </span>
          )}
        </div>

        {isUnchanged || isNew ? (
          <p className="text-sm text-neutral-900 font-medium break-words">{displayAfter}</p>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-neutral-500 line-through break-words">{displayBefore}</p>
            <p className="text-sm text-neutral-900 font-medium break-words">{displayAfter}</p>
          </div>
        )}
      </div>
    </div>
  );
}
