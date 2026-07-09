import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Button } from "../button/index.js";
import { MaterialIcon } from "../material-icon/index.js";
import { Spinner } from "../spinner/index.js";

export function LoadingButton({
  loading = false,
  loadingLabel,
  icon,
  iconFilled = false,
  compact = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  icon?: string;
  iconFilled?: boolean;
  compact?: boolean;
}) {
  const isDisabled = disabled || loading;

  return (
    <button type={type} disabled={isDisabled} aria-busy={loading} className={className} {...props}>
      <span className={`inline-flex items-center ${compact ? "" : "gap-2"}`}>
        {loading ? (
          <Spinner className="h-4 w-4" />
        ) : icon ? (
          <MaterialIcon name={icon} filled={iconFilled} className="text-[18px]" />
        ) : null}
        {!compact ? <span>{loading ? (loadingLabel ?? "Loading...") : children}</span> : null}
      </span>
    </button>
  );
}

export function InlineLoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
      <Spinner />
      {label}
    </span>
  );
}

export function PageLoadingState({
  title,
  description,
  details,
}: {
  title: string;
  description?: string;
  details?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-none">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
          <Spinner className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Loading</p>
          <h3 className="mt-1 font-title-md text-title-md font-bold">{title}</h3>
          {description ? <p className="mt-1 text-body-md text-on-surface-variant">{description}</p> : null}
          {details ? <div className="mt-4">{details}</div> : null}
        </div>
      </div>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-full animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-surface-container-high" />
        <div className="h-3 w-2/3 animate-pulse rounded-full bg-surface-container-high" />
      </div>
    </section>
  );
}

export function PageErrorState({
  title,
  description,
  onRetry,
  retryLabel = "Retry",
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-none">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-error-container text-on-error-container">
          <MaterialIcon name="error" filled />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">
            Unable to load
          </p>
          <h3 className="mt-1 font-title-md text-title-md font-bold">{title}</h3>
          {description ? <p className="mt-1 text-body-md text-on-surface-variant">{description}</p> : null}
          {onRetry ? (
            <Button className="mt-4" onClick={onRetry}>
              <MaterialIcon name="refresh" />
              {retryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

type ProcessStateTone = "neutral" | "busy" | "success" | "danger";

export function ProcessStateCard({
  title,
  description,
  message,
  progress,
  tone = "neutral",
}: {
  title: string;
  description?: string;
  message: string;
  progress?: number;
  tone?: ProcessStateTone;
}) {
  const palette = {
    neutral: "bg-secondary-container text-on-secondary-container",
    busy: "bg-primary-container text-on-primary-container",
    success: "bg-primary-container text-on-primary-container",
    danger: "bg-error-container text-on-error-container",
  }[tone];

  const icon = tone === "danger" ? "error" : tone === "success" ? "check_circle" : "sync";

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${palette}`}>
          {tone === "busy" ? <Spinner className="h-5 w-5" /> : <MaterialIcon name={icon} filled />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">{title}</p>
          <p className="mt-1 text-body-md font-semibold text-on-background">{message}</p>
          {description ? <p className="mt-1 text-body-md text-on-surface-variant">{description}</p> : null}
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${
              tone === "danger" ? "bg-error" : tone === "success" ? "bg-primary" : "bg-secondary"
            }`}
            style={{
              width: `${Math.max(4, Math.min(100, progress))}%`,
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
