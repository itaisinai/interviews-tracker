export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={[
        "inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      ].join(" ")}
      aria-hidden="true"
    />
  );
}
