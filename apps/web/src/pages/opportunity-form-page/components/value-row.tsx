import type { ReactNode } from "react";

export function ValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <p className="font-label-md text-label-md uppercase text-on-surface-variant">{label}</p>
      <div className="mt-2 text-body-md text-on-background">{value}</div>
    </div>
  );
}
