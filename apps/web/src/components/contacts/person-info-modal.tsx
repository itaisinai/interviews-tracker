import { useState } from "react";
import { Modal, MaterialIcon, JobHistoryTimeline } from "@interviews-tracker/design-system";
import type { CompanyExperience } from "@interviews-tracker/design-system";
import type { Person } from "../../lib/types";
import { ChevronDown } from "lucide-react";

type PersonInfoModalProps = {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onRefreshResearch?: () => void;
  onMarkAsWrong?: () => void;
  onDelete?: () => void;
  showActions?: {
    refreshResearch?: boolean;
    markAsWrong?: boolean;
    delete?: boolean;
  };
};

export function PersonInfoModal({
  person,
  isOpen,
  onClose,
  onRefreshResearch,
  onMarkAsWrong,
  onDelete,
  showActions = {
    refreshResearch: true,
    markAsWrong: true,
    delete: true,
  },
}: PersonInfoModalProps) {
  const [showAllExperience, setShowAllExperience] = useState(false);
  const hasResearch = !!person.research;

  // Transform experience data to match JobHistoryTimeline format
  const experienceData: CompanyExperience[] = ((person.research?.experience || []) as any[]).map((exp: any) => {
    const positions = (exp.positions || []).map((pos: any) => {
      const [startDate = "", endDate = ""] = (pos.dates || "").split(" - ");
      return {
        title: pos.title,
        startDate: startDate.trim(),
        endDate: endDate.trim() || "Present",
        duration: pos.duration || "",
        description: pos.description,
      };
    });

    return {
      companyName: exp.company,
      companyUrl: exp.companyUrl,
      totalDuration: exp.totalDuration || "",
      positions,
    };
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={person.name}>
      <div className="flex flex-col">
        {/* Header Actions */}
        <div className="flex items-center justify-end gap-2 border-b border-outline-variant px-6 py-3">
          {hasResearch && showActions.refreshResearch && (
            <button
              onClick={onRefreshResearch}
              className="inline-flex items-center gap-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
              title="Refresh research data from LinkedIn"
            >
              <MaterialIcon name="refresh" className="text-[20px]" />
            </button>
          )}
          {hasResearch && showActions.markAsWrong && (
            <button
              onClick={onMarkAsWrong}
              className="inline-flex items-center gap-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-warning"
              title="Mark as wrong person"
            >
              <MaterialIcon name="person_off" className="text-[20px]" />
            </button>
          )}
          {showActions.delete && (
            <button
              onClick={onDelete}
              className="inline-flex items-center gap-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
              title="Delete contact"
            >
              <MaterialIcon name="delete" className="text-[20px]" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {!hasResearch ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MaterialIcon
                name="search"
                className="mb-4 text-[48px] text-on-surface-variant"
              />
              <p className="mb-2 text-body-lg font-medium text-on-surface">
                No research yet
              </p>
              <p className="text-center text-body-sm text-on-surface-variant">
                Click "Refresh" to research this person's professional background
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Experience */}
              {experienceData.length > 0 && (
                <div>
                  <h3 className="mb-4 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                    Experience
                  </h3>
                  <JobHistoryTimeline
                    companies={showAllExperience ? experienceData : experienceData.slice(0, 2)}
                  />
                  {experienceData.length > 2 && (
                    <button
                      type="button"
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2.5 text-body-md font-medium text-on-surface transition-all duration-200 hover:bg-surface-container"
                      onClick={() => setShowAllExperience(!showAllExperience)}
                    >
                      <span className={`transition-transform duration-300 ${showAllExperience ? "rotate-180" : "rotate-0"}`}>
                        <ChevronDown className="h-4 w-4" />
                      </span>
                      {showAllExperience ? "Show less" : `Show ${experienceData.length - 2} more`}
                    </button>
                  )}
                </div>
              )}

              {/* LinkedIn Link */}
              {person.linkedinUrl && (
                <div className="border-t border-outline-variant pt-4">
                  <a
                    href={person.linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-body-sm font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    <MaterialIcon name="link" className="text-[18px]" />
                    View LinkedIn Profile
                    <MaterialIcon name="open_in_new" className="text-[16px]" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-outline-variant p-6">
          <button
            onClick={onClose}
            className="rounded-lg bg-primary px-6 py-2 font-medium text-on-primary transition-colors hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
