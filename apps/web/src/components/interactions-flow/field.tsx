import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </span>
      {children}
    </label>
  );
}
