import { MaterialIcon, Modal, JobHistoryTimeline } from "@interviews-tracker/design-system";
import type { CompanyExperience } from "@interviews-tracker/design-system";

import type { Person } from "../../lib/types";
import { useState } from "react";
import { detectCompanyMismatch } from "../../lib/person-utils";

type PersonDetailModalProps = {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onResearch: (name: string, title?: string, linkedinUrl?: string) => void;
  onDelete?: (personId: string) => void;
  opportunityCompanyName?: string;
  onFixCompanyMismatch?: () => void;
  opportunityId?: string;
  onMarkAsWrong?: () => void;
};

export function PersonDetailModal({
  person,
  isOpen,
  onClose,
  onResearch,
  onDelete,
  opportunityCompanyName,
  onFixCompanyMismatch,
  opportunityId,
  onMarkAsWrong,
}: PersonDetailModalProps) {
  const [showAllExperience, setShowAllExperience] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);

  // Transform experience data to match JobHistoryTimeline component format
  const rawExperience = person.research?.experience as Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }> | undefined;

  const experienceData: CompanyExperience[] = (rawExperience || []).map((exp) => {
    const positions = (exp.positions || []).map((pos) => {
      // Split dates into start and end
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

  const education =
    (person.research?.education as Array<{
      institution: string;
      degree?: string;
      dates?: string;
    }>) || [];

  const skills = (person.research?.skills as string[]) || [];

  const hasResearch = !!person.research;
  const hasMismatch = opportunityCompanyName && detectCompanyMismatch(person, opportunityCompanyName);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={person.name}>
      <div className="flex flex-col">
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          {/* Company Mismatch Warning */}
          {hasMismatch && onFixCompanyMismatch && (
            <div className="mb-4 rounded-lg border border-warning bg-warning/10 p-4">
              <div className="flex items-start gap-3">
                <MaterialIcon name="warning" className="text-[24px] text-warning" />
                <div className="flex-1">
                  <p className="text-body-md font-medium text-on-surface">
                    Company mismatch detected
                  </p>
                  <p className="mt-1 text-body-sm text-on-surface-variant">
                    This contact's LinkedIn shows they work at {person.company}, but this opportunity is for {opportunityCompanyName}.
                  </p>
                  <button
                    onClick={() => {
                      onFixCompanyMismatch();
                      onClose();
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-warning px-4 py-2 font-medium text-white transition-colors hover:bg-warning/90"
                  >
                    <MaterialIcon name="edit" className="text-[20px]" />
                    Fix Company Mismatch
                  </button>
                </div>
              </div>
            </div>
          )}

          {!hasResearch ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MaterialIcon
                name="search"
                className="mb-4 text-[48px] text-on-surface-variant"
              />
              <p className="mb-2 text-body-lg font-medium text-on-surface">
                No research yet
              </p>
              <p className="mb-6 text-center text-body-sm text-on-surface-variant">
                Research this person to get their professional background,
                experience, and skills
              </p>
              <button
                onClick={() =>
                  onResearch(person.name, person.title || undefined, person.linkedinUrl || undefined)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-on-primary transition-colors hover:bg-primary/90"
              >
                <MaterialIcon name="search" className="text-[20px]" />
                Research Person
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* About */}
              {person.research?.about && (
                <div>
                  <h3 className="mb-3 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                    About
                  </h3>
                  <p className="text-body-md leading-relaxed text-on-surface-variant">
                    {person.research.about}
                  </p>
                </div>
              )}

              {/* Experience */}
              {experienceData.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                      Experience
                    </h3>
                    {experienceData.length > 2 && (
                      <button
                        onClick={() => setShowAllExperience(!showAllExperience)}
                        className="flex items-center gap-1 text-body-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {showAllExperience
                          ? "Show less"
                          : `Show all (${experienceData.length})`}
                        <MaterialIcon
                          name={
                            showAllExperience ? "expand_less" : "expand_more"
                          }
                          className="text-[18px]"
                        />
                      </button>
                    )}
                  </div>

                  <JobHistoryTimeline
                    companies={experienceData.slice(0, showAllExperience ? undefined : 2)}
                  />

                  {!showAllExperience && experienceData.length > 2 && (
                    <div
                      className="overflow-hidden transition-all duration-300 ease-in-out"
                      style={{ maxHeight: 0, opacity: 0 }}
                    />
                  )}
                </div>
              )}

              {/* Education */}
              {education.length > 0 && (
                <div>
                  <h3 className="mb-4 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                    Education
                  </h3>

                  <div className="space-y-6">
                    {education
                      .slice(0, showAllEducation ? undefined : 2)
                      .map((edu, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-surface-container" />
                          <div className="min-w-0 flex-1">
                            <h4 className="text-body-lg font-bold text-on-surface">
                              {edu.institution}
                            </h4>
                            {edu.degree && (
                              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                {edu.degree}
                              </p>
                            )}
                            {edu.dates && (
                              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                {edu.dates}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {education.length > 2 && (
                    <button
                      onClick={() => setShowAllEducation(!showAllEducation)}
                      className="mt-4 flex items-center gap-1 text-body-sm font-medium text-primary transition-colors hover:text-primary/80"
                    >
                      {showAllEducation
                        ? "Show less"
                        : `Show all ${education.length} education`}
                      <MaterialIcon
                        name={showAllEducation ? "expand_less" : "expand_more"}
                        className="text-[18px]"
                      />
                    </button>
                  )}
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div>
                  <h3 className="mb-3 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.slice(0, 20).map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-body-xs font-medium text-on-surface-variant"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
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
        <div className="flex items-center justify-between border-t border-outline-variant p-6">
          <div className="flex gap-3">
            {onDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${person.name}? This will remove all their research data.`)) {
                    onDelete(person.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-error px-4 py-2 font-medium text-error transition-colors hover:bg-error/10"
              >
                <MaterialIcon name="delete" className="text-[20px]" />
                Delete Contact
              </button>
            )}
            {hasResearch && onMarkAsWrong && opportunityId && (
              <button
                onClick={() => {
                  if (window.confirm(`Mark ${person.name} as the wrong person? This will help future searches exclude this candidate.`)) {
                    onMarkAsWrong();
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-warning px-4 py-2 font-medium text-warning transition-colors hover:bg-warning/10"
              >
                <MaterialIcon name="person_off" className="text-[20px]" />
                Mark as Wrong Person
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasResearch && (
              <button
                onClick={() => onResearch(person.name, person.title || undefined, person.linkedinUrl || undefined)}
                className="inline-flex items-center gap-2 rounded-lg border border-outline px-4 py-2 font-medium text-primary transition-colors hover:bg-surface-container"
              >
                <MaterialIcon name="refresh" className="text-[20px]" />
                Refresh Research
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-6 py-2 font-medium text-on-primary transition-colors hover:bg-primary/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
