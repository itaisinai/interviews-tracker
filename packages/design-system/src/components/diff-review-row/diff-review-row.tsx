import type { ReactNode } from "react";

export type DiffReviewRowProps = {
  label: string;
  currentValue: ReactNode;
  newValue: ReactNode;
  isChanged: boolean;
  className?: string;
};

export function DiffReviewRow({
  label,
  currentValue,
  newValue,
  isChanged,
  className = "",
}: DiffReviewRowProps) {
  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isChanged
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-neutral-200 bg-neutral-50/30"
      } ${className}`}
    >
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-600">
        {label}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <div className="mb-1 text-xs text-neutral-500">Current</div>
          <div className="text-sm text-neutral-700">
            {currentValue || (
              <span className="italic text-neutral-400">Empty</span>
            )}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs text-emerald-600">New</div>
          <div className="text-sm font-medium text-neutral-900">
            {newValue || (
              <span className="italic text-neutral-400">Empty</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
