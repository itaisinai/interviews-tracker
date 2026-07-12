import { useState } from "react";

import { MaterialIcon, Modal } from "@interviews-tracker/design-system";

import type { Person } from "../../lib/types";

type ManualJobUpdateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  person: Person;
  opportunityCompanyName: string;
  onSubmit: (jobDescription: string) => void;
  isLoading?: boolean;
};

export function ManualJobUpdateModal({
  isOpen,
  onClose,
  person,
  opportunityCompanyName,
  onSubmit,
  isLoading,
}: ManualJobUpdateModalProps) {
  const [jobDescription, setJobDescription] = useState("");

  const handleSubmit = () => {
    if (jobDescription.trim()) {
      onSubmit(jobDescription.trim());
    }
  };

  const handleClose = () => {
    setJobDescription("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg" title="Update Current Job">
      <div className="flex flex-col">
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="mb-6 space-y-4">
            <div>
              <p className="text-body-md text-on-surface-variant">
                Paste the current job description from their LinkedIn profile. This will be parsed to extract the
                current position details.
              </p>
            </div>

            {person.linkedinUrl && (
              <div>
                <label className="label mb-2">LinkedIn Profile</label>
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-primary hover:bg-surface-container"
                >
                  <MaterialIcon name="open_in_new" className="text-[18px]" />
                  Open LinkedIn Profile
                </a>
              </div>
            )}

            <div className="rounded-lg bg-surface-container-lowest p-4">
              <div className="flex items-start gap-3">
                <MaterialIcon name="lightbulb" className="text-[20px] text-tertiary" />
                <div className="flex-1 text-body-sm text-on-surface-variant">
                  <p className="font-medium">Tip:</p>
                  <p className="mt-1">
                    Copy the current position section from their LinkedIn profile. Include the company name, job title,
                    start date, and any description.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="job-description" className="label mb-2">
              Current Job Description *
            </label>
            <textarea
              id="job-description"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder={`Example:\n\nSoftware Engineer at ${opportunityCompanyName}\nMar 2024 - Present\n\nBuilding scalable web applications...`}
              className="h-48 w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isLoading}
            />
            <p className="mt-2 text-body-xs text-on-surface-variant">
              The AI will extract the job title, company name, start date, and description from this text.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant p-6">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg px-6 py-2 font-medium text-on-surface transition-colors hover:bg-surface-container"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!jobDescription.trim() || isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                Parsing...
              </>
            ) : (
              <>
                <MaterialIcon name="check" className="text-[20px]" />
                Parse & Review
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
