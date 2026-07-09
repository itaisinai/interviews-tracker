import type { ReactNode } from "react";

export type BadgeTone = "green" | "blue" | "violet" | "red" | "rose" | "neutral" | "muted" | "warning" | "active";

const tones: Record<BadgeTone, string> = {
  active: "bg-primary text-on-primary",
  green: "bg-primary text-on-primary",
  blue: "bg-tertiary-container text-on-tertiary-container",
  violet: "bg-tertiary-container text-on-tertiary-container",
  red: "bg-error-container text-on-error-container",
  rose: "bg-red-50 text-red-600",
  neutral: "bg-surface-container-highest text-on-surface-variant",
  muted: "bg-surface-container text-on-surface-variant",
  warning: "bg-secondary-container text-on-secondary-container",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-label-md text-[11px] leading-none",
        tones[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
