import { MaterialIcon } from "@interviews-tracker/design-system";

export function GmailEmptyState() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
      <MaterialIcon name="inbox" className="mb-4 text-5xl text-on-surface-variant" />
      <p className="mb-2 font-title-md text-title-md font-medium text-on-surface">No emails found</p>
      <p className="text-body-sm text-on-surface-variant">No job opportunity emails found in the last 6 months.</p>
    </div>
  );
}
