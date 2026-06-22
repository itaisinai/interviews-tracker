import { Modal, MaterialIcon, JobHistoryTimeline } from "@interviews-tracker/design-system";
import type { CompanyExperience } from "@interviews-tracker/design-system";

type ReviewJobTimelineModalProps = {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  currentTimeline: Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }>;
  updatedTimeline: Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }>;
  onApply: () => void;
  isApplying?: boolean;
};

export function ReviewJobTimelineModal({
  isOpen,
  onClose,
  personName,
  currentTimeline,
  updatedTimeline,
  onApply,
  isApplying
}: ReviewJobTimelineModalProps) {
  // Transform to CompanyExperience format for JobHistoryTimeline
  const transformToCompanyExperience = (timeline: typeof updatedTimeline): CompanyExperience[] => {
    return timeline.map((exp) => {
      const positions = exp.positions.map((pos) => {
        const [startDate = "", endDate = ""] = (pos.dates || "").split(" - ");
        return {
          title: pos.title,
          startDate: startDate.trim(),
          endDate: endDate.trim() || "Present",
          duration: pos.duration || "",
          description: pos.description
        };
      });

      return {
        companyName: exp.company,
        companyUrl: exp.companyUrl,
        totalDuration: exp.totalDuration || "",
        positions
      };
    });
  };

  const updatedExperience = transformToCompanyExperience(updatedTimeline);

  // Detect changes for highlighting
  const hasChanges = JSON.stringify(currentTimeline) !== JSON.stringify(updatedTimeline);
  const newCompany = updatedTimeline[0];
  const isNewJob = !currentTimeline.some(exp => exp.company === newCompany?.company);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Review Timeline Changes"
    >
      <div className="flex flex-col">
        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <div className="mb-6 rounded-lg bg-tertiary/10 p-4">
            <div className="flex items-start gap-3">
              <MaterialIcon name="info" className="text-[24px] text-tertiary" />
              <div className="flex-1">
                <p className="text-body-md font-medium text-on-surface">
                  Review the updated job timeline for {personName}
                </p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {isNewJob ? "A new current position has been added." : "The existing timeline has been updated."}
                  {" "}Check the changes below and apply if everything looks correct.
                </p>
              </div>
            </div>
          </div>

          {hasChanges && (
            <div className="mb-6 space-y-3">
              <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
                Changes Summary
              </h3>

              {isNewJob && newCompany && (
                <div className="flex items-start gap-3 rounded-lg border border-tertiary/30 bg-tertiary/5 p-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-tertiary/20">
                    <MaterialIcon name="add" className="text-[20px] text-tertiary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-body-sm font-medium text-on-surface">
                      New current position added
                    </p>
                    <p className="mt-1 text-body-sm text-on-surface-variant">
                      {newCompany.positions[0]?.title} at {newCompany.company}
                    </p>
                    <p className="text-body-xs text-on-surface-variant">
                      {newCompany.positions[0]?.dates}
                    </p>
                  </div>
                </div>
              )}

              {/* Check for adjusted previous jobs */}
              {currentTimeline.map((oldExp, index) => {
                const oldPosition = oldExp.positions.find(p => p.dates?.includes("Present"));
                const newExp = updatedTimeline.find(e => e.company === oldExp.company);
                const newPosition = newExp?.positions.find(p => p.title === oldPosition?.title);

                if (oldPosition && newPosition && oldPosition.dates !== newPosition.dates) {
                  return (
                    <div key={index} className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-warning/20">
                        <MaterialIcon name="edit" className="text-[20px] text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-body-sm font-medium text-on-surface">
                          Previous position end date adjusted
                        </p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {oldPosition.title} at {oldExp.company}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-body-xs text-on-surface-variant">
                          <span className="line-through opacity-60">{oldPosition.dates}</span>
                          <MaterialIcon name="arrow_forward" className="text-[14px]" />
                          <span className="font-medium">{newPosition.dates}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          )}

          <div>
            <h3 className="mb-4 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
              Updated Timeline
            </h3>
            <JobHistoryTimeline companies={updatedExperience} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant p-6">
          <button
            onClick={onClose}
            className="rounded-lg px-6 py-2 font-medium text-on-surface transition-colors hover:bg-surface-container"
            disabled={isApplying}
          >
            Discard
          </button>
          <button
            onClick={onApply}
            disabled={isApplying}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2 font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isApplying ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary border-t-transparent" />
                Applying...
              </>
            ) : (
              <>
                <MaterialIcon name="check" className="text-[20px]" />
                Apply Changes
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
