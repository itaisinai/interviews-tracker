export function GmailLoadingState() {
  return (
    <div className="flex min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-body-sm text-on-surface-variant">Searching Gmail...</p>
        <p className="mt-2 text-body-xs text-on-surface-variant">Looking for emails from the last 6 months</p>
      </div>
    </div>
  );
}
