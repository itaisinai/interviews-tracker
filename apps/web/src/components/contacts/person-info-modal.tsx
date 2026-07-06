import {
  JobHistoryTimeline,
  MaterialIcon,
  Modal,
} from "@interviews-tracker/design-system";

import { ChevronDown } from "lucide-react";
import type { CompanyExperience } from "@interviews-tracker/design-system";
import type { Person } from "../../lib/types";
import { useState } from "react";

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

  // Get initials for avatar
  const initials = person.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Transform experience data to match JobHistoryTimeline format
  const experienceData: CompanyExperience[] = (
    (person.research?.experience || []) as any[]
  ).map((exp: any) => {
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

  // Get current position from raw dates to avoid treating unparseable/missing dates as "Present"
  const currentPosition = Array.isArray(person.research?.experience)
    ? (person.research.experience as any[])
        .flatMap((exp: any) =>
          (exp.positions || []).map((pos: any) => {
            const rawDates = pos.dates || "";
            const isPresentOrCurrent =
              rawDates.toLowerCase().includes("present") ||
              rawDates.toLowerCase().includes("current");
            return isPresentOrCurrent
              ? { title: pos.title, company: exp.company }
              : null;
          }),
        )
        .find(Boolean)
    : undefined;

  const subtitle = currentPosition
    ? `${currentPosition.title} at ${currentPosition.company}`
    : person.title || "Interview Research";

  const visibleExperiences = showAllExperience
    ? experienceData
    : experienceData.slice(0, 3);

  return (
    <>
      <style>{`
        [aria-labelledby="modal-title"]:has(#person-modal-content) > div:first-child {
          display: none;
        }
        [aria-labelledby="modal-title"]:has(#person-modal-content) > div:nth-child(2) {
          padding: 0;
          max-height: none;
        }
      `}</style>
      <Modal isOpen={isOpen} onClose={onClose} size="lg" title="">
        <div id="person-modal-content" className="flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-outline-variant px-6 py-5">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-tertiary-container text-on-tertiary-container">
                <span className="font-title-lg text-title-lg font-bold">
                  {initials}
                </span>
              </div>

              {/* Name and context */}
              <div>
                <h2 className="font-title-lg text-title-lg font-bold text-on-surface">
                  {person.name}
                </h2>
                <p className="mt-0.5 text-body-md text-on-surface-variant">
                  {subtitle}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {person.linkedinUrl && (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-outline px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                  <MaterialIcon name="link" className="text-[18px]" />
                  LinkedIn
                </a>
              )}
              {hasResearch && showActions.refreshResearch && (
                <button
                  onClick={onRefreshResearch}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                  <MaterialIcon name="refresh" className="text-[18px]" />
                  Research Again
                </button>
              )}
              {hasResearch && showActions.markAsWrong && (
                <button
                  onClick={onMarkAsWrong}
                  className="inline-flex items-center gap-2 rounded-lg border border-outline px-4 py-2 text-body-md font-medium text-on-surface transition-colors hover:bg-surface-container"
                >
                  <MaterialIcon name="person_off" className="text-[18px]" />
                  Wrong Person
                </button>
              )}
              {showActions.delete && (
                <button
                  onClick={onDelete}
                  className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-2 text-body-md font-medium text-error transition-colors hover:bg-error-container"
                >
                  <MaterialIcon name="delete" className="text-[18px]" />
                  Delete
                </button>
              )}
              <button
                onClick={onClose}
                className="ml-2 rounded-lg p-2 text-on-surface-variant transition-colors hover:bg-surface-container"
              >
                <MaterialIcon name="close" className="text-[24px]" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-[70vh] overflow-y-auto bg-surface-container-lowest p-6">
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
                  Click "Research Again" to research this person's professional
                  background
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview */}
                {person.research?.about && (
                  <div>
                    <h3 className="mb-3 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                      Overview
                    </h3>
                    <p className="text-body-md leading-relaxed text-on-surface">
                      {person.research.about}
                    </p>
                    {person.linkedinUrl && (
                      <a
                        href={person.linkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-body-md font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        <MaterialIcon name="link" className="text-[18px]" />
                        View LinkedIn Profile
                        <MaterialIcon
                          name="open_in_new"
                          className="text-[16px]"
                        />
                      </a>
                    )}
                  </div>
                )}

                {/* Experience */}
                {experienceData.length > 0 && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                        Experience
                      </h3>
                      {experienceData.length > 3 && (
                        <button
                          onClick={() =>
                            setShowAllExperience(!showAllExperience)
                          }
                          className="text-body-md font-medium text-primary transition-colors hover:text-primary/80"
                        >
                          {showAllExperience
                            ? "Show less"
                            : `Show all (${experienceData.length})`}
                        </button>
                      )}
                    </div>

                    <JobHistoryTimeline companies={visibleExperiences} />

                    {/* Show more button */}
                    {experienceData.length > 3 && (
                      <button
                        type="button"
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-outline bg-surface px-4 py-2.5 text-body-md font-medium text-on-surface transition-all duration-200 hover:bg-surface-container"
                        onClick={() => setShowAllExperience(!showAllExperience)}
                      >
                        <span
                          className={`transition-transform duration-300 ${showAllExperience ? "rotate-180" : "rotate-0"}`}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </span>
                        {showAllExperience
                          ? "Show less"
                          : `Show ${experienceData.length - 3} more`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end border-t border-outline-variant bg-surface px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-8 py-2.5 font-label-lg text-label-lg font-medium text-on-primary transition-colors hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
