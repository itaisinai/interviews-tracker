import { MaterialIcon, Modal } from "@interviews-tracker/design-system";

import type { Person } from "../../lib/types";
import { useState } from "react";

type PersonDetailModalProps = {
  person: Person;
  isOpen: boolean;
  onClose: () => void;
  onResearch: (name: string, title?: string) => void;
};

export function PersonDetailModal({
  person,
  isOpen,
  onClose,
  onResearch,
}: PersonDetailModalProps) {
  const [showAllExperience, setShowAllExperience] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);

  const experience =
    (person.research?.experience as Array<{
      company: string;
      companyUrl?: string;
      title: string;
      dates?: string;
      duration?: string;
    }>) || [];

  const education =
    (person.research?.education as Array<{
      institution: string;
      degree?: string;
      dates?: string;
    }>) || [];

  const skills = (person.research?.skills as string[]) || [];

  const hasResearch = !!person.research;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" title={person.name}>
      <div className="flex flex-col">
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
              <p className="mb-6 text-center text-body-sm text-on-surface-variant">
                Research this person to get their professional background,
                experience, and skills
              </p>
              <button
                onClick={() =>
                  onResearch(person.name, person.title || undefined)
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
              {experience.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                      Experience
                    </h3>
                    {experience.length > 3 && (
                      <button
                        onClick={() => setShowAllExperience(!showAllExperience)}
                        className="flex items-center gap-1 text-body-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {showAllExperience
                          ? "Show less"
                          : `Show all (${experience.length})`}
                        <MaterialIcon
                          name={
                            showAllExperience ? "expand_less" : "expand_more"
                          }
                          className="text-[18px]"
                        />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {experience
                      .slice(0, showAllExperience ? undefined : 3)
                      .map((exp, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container">
                            <MaterialIcon
                              name="work"
                              className="text-[20px] text-on-surface-variant"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            {exp.companyUrl ? (
                              <a
                                href={exp.companyUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-title-sm text-title-sm font-bold text-primary transition-colors hover:text-primary/80"
                              >
                                <span className="underline">{exp.company}</span>
                                <MaterialIcon
                                  name="open_in_new"
                                  className="flex-shrink-0 text-[18px]"
                                />
                              </a>
                            ) : (
                              <p className="font-title-sm text-title-sm font-bold text-on-surface">
                                {exp.company}
                              </p>
                            )}
                            <p className="mt-0.5 text-body-md text-on-surface-variant">
                              {exp.title}
                            </p>
                            {(exp.dates || exp.duration) && (
                              <p className="mt-1 text-body-sm text-on-surface-variant">
                                {exp.dates}
                                {exp.duration && ` · ${exp.duration}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>

                  {!showAllExperience && experience.length > 3 && (
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
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                      Education
                    </h3>
                    {education.length > 2 && (
                      <button
                        onClick={() => setShowAllEducation(!showAllEducation)}
                        className="flex items-center gap-1 text-body-sm font-medium text-primary transition-colors hover:text-primary/80"
                      >
                        {showAllEducation
                          ? "Show less"
                          : `Show all (${education.length})`}
                        <MaterialIcon
                          name={
                            showAllEducation ? "expand_less" : "expand_more"
                          }
                          className="text-[18px]"
                        />
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {education
                      .slice(0, showAllEducation ? undefined : 2)
                      .map((edu, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container">
                            <MaterialIcon
                              name="school"
                              className="text-[20px] text-on-surface-variant"
                            />
                          </div>
                          <div>
                            <p className="font-title-sm text-title-sm font-bold text-on-surface">
                              {edu.institution}
                            </p>
                            {edu.degree && (
                              <p className="mt-0.5 text-body-md text-on-surface-variant">
                                {edu.degree}
                              </p>
                            )}
                            {edu.dates && (
                              <p className="mt-1 text-body-sm text-on-surface-variant">
                                {edu.dates}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
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
        <div className="flex items-center justify-end gap-3 border-t border-outline-variant p-6">
          {hasResearch && (
            <button
              onClick={() => onResearch(person.name, person.title || undefined)}
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
    </Modal>
  );
}
