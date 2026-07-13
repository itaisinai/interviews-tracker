interface StatusBadgeProps {
  status: "USED" | "HIDDEN" | "IGNORED";
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    USED: "bg-surface-container-high text-on-surface-variant",
    HIDDEN: "bg-error-container text-on-error-container",
    IGNORED: "bg-warning-container text-on-warning-container",
  };

  const labels = {
    USED: "Used",
    HIDDEN: "Hidden",
    IGNORED: "Ignored",
  };

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
