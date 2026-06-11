import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={[
        "w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-md outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:bg-surface-container-low",
        className,
      ].join(" ")}
      {...props}
    />
  );
}
