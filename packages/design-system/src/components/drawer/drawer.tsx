import type { ReactNode } from "react";

import { Button } from "../button/index.js";
import { MaterialIcon } from "../material-icon/index.js";

export function Drawer({
  open,
  title,
  description,
  children,
  footer,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        aria-label="Close drawer"
        className="absolute inset-0 bg-ink/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <aside className="relative ml-auto flex h-full w-full max-w-xl flex-col border-l border-outline-variant bg-surface-container-lowest shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-outline-variant px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate font-title-md text-title-md font-bold">{title}</h2>
            {description ? <p className="mt-1 text-body-md text-on-surface-variant">{description}</p> : null}
          </div>
          <Button variant="secondary" size="sm" leadingIcon="close" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer ? <footer className="border-t border-outline-variant p-6">{footer}</footer> : null}
      </aside>
    </div>
  );
}
