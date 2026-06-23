import { Modal, MaterialIcon } from "@interviews-tracker/design-system";
import type { Person } from "../../lib/types";

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
  const hasResearch = !!person.research;

  // Transform experience data
  const rawExperience = person.research?.experience as Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      location?: string;
      employmentType?: string;
    }>;
  }> | undefined;

  const experiences = rawExperience || [];

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
              {experiences.length > 0 && (
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                      Experience
                    </h3>
                    {experiences.length > 3 && (
                      <button className="text-body-sm font-medium text-primary transition-colors hover:text-primary/80">
                        Show all ({experiences.length})
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {experiences.slice(0, 3).map((exp, expIndex) => (
                      <div key={expIndex} className="flex gap-3">
                        {/* Company Logo Placeholder */}
                        <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-surface-container" />

                        <div className="min-w-0 flex-1">
                          {exp.positions.length === 1 ? (
                            /* Single position */
                            <>
                              <h4 className="text-body-lg font-bold text-on-surface">
                                {exp.positions[0].title}
                              </h4>
                              {exp.companyUrl ? (
                                <a
                                  href={exp.companyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-0.5 text-body-sm text-on-surface-variant transition-colors hover:text-primary"
                                >
                                  {exp.company}
                                </a>
                              ) : (
                                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                  {exp.company}
                                </p>
                              )}
                              {exp.positions[0].dates && (
                                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                                  {exp.positions[0].dates}
                                  {exp.positions[0].duration &&
                                    ` · ${exp.positions[0].duration}`}
                                </p>
                              )}
                            </>
                          ) : (
                            /* Multiple positions */
                            <>
                              {exp.companyUrl ? (
                                <a
                                  href={exp.companyUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-body-lg font-bold text-on-surface transition-colors hover:text-primary"
                                >
                                  {exp.company}
                                </a>
                              ) : (
                                <h4 className="text-body-lg font-bold text-on-surface">
                                  {exp.company}
                                </h4>
                              )}
                              {exp.totalDuration && (
                                <p className="text-body-sm text-on-surface-variant">
                                  {exp.totalDuration}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
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
