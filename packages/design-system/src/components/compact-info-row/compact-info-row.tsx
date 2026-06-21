import type { ReactNode } from "react";

export type CompactInfoRowProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  href?: string;
  className?: string;
};

export function CompactInfoRow({
  label,
  value,
  icon,
  href,
  className = "",
}: CompactInfoRowProps) {
  const content = (
    <>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
        {icon && <span className="text-neutral-400">{icon}</span>}
        {label}
      </div>
      <div className="mt-1 text-sm text-neutral-900">{value}</div>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`block rounded-lg p-3 transition-colors hover:bg-neutral-50 ${className}`}
      >
        {content}
      </a>
    );
  }

  return <div className={`rounded-lg p-3 ${className}`}>{content}</div>;
}
