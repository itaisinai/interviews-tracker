import type { ReactNode } from "react";

export function FormField({
  label,
  hint,
  error,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <label htmlFor={htmlFor} className="mb-2 block font-label-md text-label-md uppercase text-on-surface-variant">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-body-md text-on-surface-variant">{hint}</p> : null}
      {error ? <p className="mt-1 text-body-md text-error">{error}</p> : null}
    </div>
  );
}
