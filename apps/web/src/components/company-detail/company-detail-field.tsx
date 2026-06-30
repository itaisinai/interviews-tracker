import { MaterialIcon } from "@interviews-tracker/design-system";

type CompanyDetailFieldProps = {
  label: string;
  value: string;
  icon?: string;
  className?: string;
  href?: string | null;
};

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function CompanyDetailField({ label, value, icon, className, href }: CompanyDetailFieldProps) {
  const effectiveHref = href || (isValidUrl(value) ? value : null);

  return (
    <div className={`flex min-w-0 items-start gap-2 ${className ?? ""}`.trim()}>
      {icon ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-primary">
          <MaterialIcon name={icon} className="text-[18px]" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="truncate font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        {effectiveHref ? (
          <a
            href={effectiveHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 inline-flex items-center gap-1 truncate text-body-md text-primary hover:underline"
            title={value}
          >
            {value}
            <MaterialIcon name="open_in_new" className="text-[16px]" />
          </a>
        ) : (
          <p className="mt-0.5 truncate text-body-md text-on-background" title={value}>
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
