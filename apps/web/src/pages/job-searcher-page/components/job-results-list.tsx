import type { JobSearchResult } from "../types";

import { JobCard } from "./job-card";

interface JobResultsListProps {
  results: JobSearchResult[];
  onJobClick: (job: JobSearchResult) => void;
}

export function JobResultsList({ results, onJobClick }: JobResultsListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">
          {results.length} {results.length === 1 ? "job" : "jobs"} found
        </h2>
      </div>

      <div className="space-y-3">
        {results.map((job) => (
          <JobCard key={job.id} job={job} onClick={() => onJobClick(job)} />
        ))}
      </div>
    </div>
  );
}
