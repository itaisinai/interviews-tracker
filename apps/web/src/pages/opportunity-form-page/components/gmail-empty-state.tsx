import { MaterialIcon } from "@interviews-tracker/design-system";

interface GmailEmptyStateProps {
  daysBack?: number;
}

export function GmailEmptyState({ daysBack = 7 }: GmailEmptyStateProps) {
  // Format the time range dynamically
  const timeRange = (() => {
    if (daysBack === 1) return "1 day";
    if (daysBack < 30) return `${daysBack} days`;
    if (daysBack === 30) return "1 month";
    if (daysBack < 60) return `${daysBack} days`;
    if (daysBack < 90) return "2 months";
    if (daysBack < 120) return "3 months";
    if (daysBack < 150) return "4 months";
    if (daysBack < 180) return "5 months";
    if (daysBack < 210) return "6 months";
    if (daysBack < 240) return "7 months";
    if (daysBack < 270) return "8 months";
    if (daysBack < 300) return "9 months";
    if (daysBack < 330) return "10 months";
    if (daysBack < 360) return "11 months";
    return "1 year";
  })();

  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
      <MaterialIcon name="inbox" className="mb-4 text-5xl text-on-surface-variant" />
      <p className="mb-2 font-title-md text-title-md font-medium text-on-surface">No emails found</p>
      <p className="text-body-sm text-on-surface-variant">No job opportunity emails found in the last {timeRange}.</p>
    </div>
  );
}
