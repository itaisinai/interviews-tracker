import type { ButtonHTMLAttributes, ReactNode } from "react";
import { MaterialIcon } from "./material-icon";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
  icon?: string;
  iconFilled?: boolean;
  compact?: boolean;
};

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
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={className}
      {...props}
    >
      <span className={`inline-flex items-center ${compact ? "" : "gap-2"}`}>
        {loading ? (
          <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : icon ? (
          <MaterialIcon name={icon} filled={iconFilled} className="text-[18px]" />
        ) : null}
        {!compact ? <span>{loading ? loadingLabel ?? "Loading..." : children}</span> : null}
      </span>
    </button>
  );
}

type PageLoadingStateProps = {
  title: string;
  description?: string;
  details?: ReactNode;
};

export function PageLoadingState({ title, description, details }: PageLoadingStateProps) {
  return (
    <section className="panel p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-container text-on-secondary-container">
          <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
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

type PageErrorStateProps = {
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function PageErrorState({ title, description, onRetry, retryLabel = "Retry" }: PageErrorStateProps) {
  return (
    <section className="panel p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-error-container text-on-error-container">
          <MaterialIcon name="error" filled />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Unable to load</p>
          <h3 className="mt-1 font-title-md text-title-md font-bold">{title}</h3>
          {description ? <p className="mt-1 text-body-md text-on-surface-variant">{description}</p> : null}
          {onRetry ? (
            <button className="btn btn-primary mt-4" onClick={onRetry}>
              <MaterialIcon name="refresh" />
              {retryLabel}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function InlineLoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </span>
  );
}
