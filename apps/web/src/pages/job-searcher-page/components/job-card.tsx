import { Badge, MaterialIcon } from "@interviews-tracker/design-system";

import type { JobSearchResult } from "../types";
import { formatJobTitle } from "../utils/parse-job-title";

interface JobCardProps {
  job: JobSearchResult;
  onClick: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const displayTitle = formatJobTitle(job.title, job.companyName);

  return (
    <button onClick={onClick} className="panel p-4 hover:shadow-md transition-shadow text-left w-full cursor-pointer">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg mb-1 truncate">{displayTitle}</h3>
          <p className="text-gray-600 mb-2">{job.companyName}</p>

          <div className="flex flex-wrap gap-2 mb-2">
            {job.location && (
              <Badge tone="neutral">
                <MaterialIcon name="location_on" className="text-sm" />
                {job.location}
              </Badge>
            )}
            {job.workModel && (
              <Badge tone="neutral">
                <MaterialIcon name="work" className="text-sm" />
                {job.workModel}
              </Badge>
            )}
            {job.postedDate && (
              <Badge tone="neutral">
                <MaterialIcon name="schedule" className="text-sm" />
                {formatDate(job.postedDate)}
              </Badge>
            )}
          </div>

          {job.snippet && <p className="text-sm text-gray-600 line-clamp-2">{job.snippet}</p>}
        </div>

        <MaterialIcon name="chevron_right" className="text-gray-400 flex-shrink-0" />
      </div>
    </button>
  );
}

function formatDate(date: string): string {
  try {
    const parsed = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return parsed.toLocaleDateString();
  } catch {
    return date;
  }
}
