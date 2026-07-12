import type { ReactNode } from "react";

import { MaterialIcon } from "../material-icon";

export type DrawerHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  className?: string;
};

export function DrawerHeader({ title, subtitle, badge, onClose, actions, className = "" }: DrawerHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          aria-label="Close"
        >
          <MaterialIcon name="close" className="text-[20px]" />
        </button>
      </div>
    </div>
  );
}
