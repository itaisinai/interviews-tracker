import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMutation } from "@tanstack/react-query";

import { Badge, Button, Drawer, MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../../lib/api";
import type { JobSearchResult } from "../types";

import { MarkdownContent } from "./markdown-content";

interface JobDetailDrawerProps {
  job: JobSearchResult;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function JobDetailDrawer({ job, isOpen, onClose, onImportSuccess }: JobDetailDrawerProps) {
  const [fullDescription, setFullDescription] = useState<string | null>(job.fullDescription);
  const navigate = useNavigate();

  const { mutate: fetchDetails, isPending: isFetchingDetails } = useMutation({
    mutationFn: () => api.getJobDetails({ url: job.url }),
    onSuccess: (data) => {
      setFullDescription(data.fullDescription);
    },
  });

  const handleImport = () => {
    const jobText = fullDescription || job.snippet || `${job.title} at ${job.companyName}\n\n${job.url}`;
    navigate("/opportunities/new", {
      state: {
        sourceText: jobText,
        linkedinUrl: job.url,
        linkedinJobId: job.id,
      },
    });
  };

  const handleLoadMore = () => {
    if (!fullDescription) {
      fetchDetails();
    }
  };

  return (
    <Drawer open={isOpen} onClose={onClose} title={job.title}>
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium mb-2">{job.companyName}</h3>
          <div className="flex flex-wrap gap-2">
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
                {formatPostedDate(job.postedDate)}
              </Badge>
            )}
          </div>
        </div>

        <div className="max-w-none">
          {fullDescription ? (
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <MarkdownContent content={fullDescription} />
            </div>
          ) : (
            <>
              {job.snippet && (
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <p className="text-gray-700 leading-relaxed">{job.snippet}</p>
                </div>
              )}
              {!job.snippet && <p className="text-gray-500 italic">No description available</p>}
              <Button variant="secondary" onClick={handleLoadMore} disabled={isFetchingDetails} className="mt-4">
                <MaterialIcon name="description" />
                {isFetchingDetails ? "Loading full description..." : "Load full description"}
              </Button>
            </>
          )}
        </div>

        <div className="flex gap-3 pt-4 border-t">
          <Button variant="primary" onClick={handleImport} className="flex-1">
            <MaterialIcon name="add" />
            Import to Pipeline
          </Button>
          <Button variant="ghost" onClick={() => window.open(job.url, "_blank", "noopener,noreferrer")}>
            <MaterialIcon name="open_in_new" />
            View on LinkedIn
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

function formatPostedDate(date: string): string {
  try {
    const parsed = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - parsed.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Posted today";
    if (diffDays === 1) return "Posted yesterday";
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.floor(diffDays / 7)} weeks ago`;
    return `Posted on ${parsed.toLocaleDateString()}`;
  } catch {
    return `Posted ${date}`;
  }
}
