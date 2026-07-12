import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-md text-label-md uppercase text-on-surface-variant">{label}</span>
      {children}
      {hint ? <p className="mt-1 text-body-md text-on-surface-variant">{hint}</p> : null}
      {error ? <p className="mt-1 text-body-md text-error">{error}</p> : null}
    </label>
  );
}
