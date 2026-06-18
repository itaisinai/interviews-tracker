import type { ReactNode } from "react";
import { MaterialIcon } from "../material-icon";

export type PreparationCardProps = {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  content?: ReactNode;
  isLoading?: boolean;
  className?: string;
};

export function PreparationCard({
  icon,
  title,
  description,
  action,
  content,
  isLoading = false,
  className = "",
}: PreparationCardProps) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md ${className}`}
    >
      <div className="mb-4 flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <MaterialIcon name={icon} className="text-[20px]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-neutral-900">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
      </div>
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-600"></div>
          Loading insights...
        </div>
      )}
      {!isLoading && content && (
        <div className="text-sm text-neutral-700">{content}</div>
      )}
      {!isLoading && action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-50"
        >
          {action.label}
          <MaterialIcon name="arrow_forward" className="text-[16px]" />
        </button>
      )}
    </div>
  );
}
