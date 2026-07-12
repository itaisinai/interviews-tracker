import { useEffect, useState } from "react";

import { ChevronDown, ChevronUp } from "lucide-react";

import type { CompanyExperience } from "@interviews-tracker/design-system";
import { Button, JobHistoryTimeline, LoadingButton, MaterialIcon, Modal } from "@interviews-tracker/design-system";

import type { PersonResearchResult } from "../../lib/types";

type PersonInfo = {
  name: string;
  title?: string | null;
  company?: string | null;
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
};

type ConfirmResearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  person: PersonInfo;
  onStartResearch: (linkedinUrl: string, saveForLater: boolean) => void;
};

export function ConfirmResearchModal({ isOpen, onClose, person, onStartResearch }: ConfirmResearchModalProps) {
  const [linkedinUrl, setLinkedinUrl] = useState(person.linkedinUrl || "");
  const [saveForLater, setSaveForLater] = useState(true);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Update LinkedIn URL when person changes (e.g., when refreshing research)
  useEffect(() => {
    setLinkedinUrl(person.linkedinUrl || "");
  }, [person.linkedinUrl]);

  const validateAndStart = () => {
    setUrlError(null);

    if (linkedinUrl.trim() && !linkedinUrl.match(/^https?:\/\/(www\.)?linkedin\.com\//i)) {
      setUrlError("Please enter a valid LinkedIn profile URL");
      return;
    }

    onStartResearch(linkedinUrl.trim(), saveForLater);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Research this person" size="md">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt={person.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
              <MaterialIcon name="person" className="text-[32px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-title-md text-title-md font-bold">{person.name}</h3>
            {person.title || person.company ? (
              <p className="mt-1 text-body-md text-on-surface-variant">
                {person.title}
                {person.title && person.company ? " · " : ""}
                {person.company}
              </p>
            ) : null}
            {person.linkedinUrl ? (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-primary transition-colors hover:text-primary/80"
              >
                <MaterialIcon name="open_in_new" className="flex-shrink-0" />
                <span className="underline">LinkedIn</span>
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg bg-surface-container-low p-4">
          <p className="text-body-md text-on-surface-variant">
            We'll search public sources, including LinkedIn, to find information about this person.
          </p>
          <p className="mt-3 font-label-md text-label-md uppercase tracking-wide text-on-surface-variant">
            What will be researched:
          </p>
          <ul className="mt-2 space-y-1 text-body-md text-on-surface-variant">
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" className="mt-0.5 text-[18px] text-primary" />
              <span>Professional background and experience</span>
            </li>
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" className="mt-0.5 text-[18px] text-primary" />
              <span>Current role and company</span>
            </li>
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" className="mt-0.5 text-[18px] text-primary" />
              <span>Education and skills</span>
            </li>
            <li className="flex items-start gap-2">
              <MaterialIcon name="check" className="mt-0.5 text-[18px] text-primary" />
              <span>Public LinkedIn information</span>
            </li>
          </ul>
        </div>

        <div>
          <label className="block">
            <span className="label">LinkedIn profile URL (optional)</span>
            <input
              className={`input mt-2 ${urlError ? "border-error" : ""}`}
              type="url"
              placeholder="https://www.linkedin.com/in/..."
              value={linkedinUrl}
              onChange={(e) => {
                setLinkedinUrl(e.target.value);
                setUrlError(null);
              }}
            />
            {urlError ? (
              <p className="mt-1 text-body-sm text-error">{urlError}</p>
            ) : (
              <p className="mt-1 text-body-sm text-on-surface-variant">Adding a LinkedIn URL can improve accuracy.</p>
            )}
          </label>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="saveForLater"
            checked={saveForLater}
            onChange={(e) => setSaveForLater(e.target.checked)}
            className="h-5 w-5 rounded border-outline accent-primary"
          />
          <label htmlFor="saveForLater" className="flex-1 cursor-pointer">
            <span className="block font-label-md text-label-md">Save research for later</span>
            <span className="mt-0.5 block text-body-sm text-on-surface-variant">
              You'll be able to view it anytime from the person profile.
            </span>
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={validateAndStart}>
          <MaterialIcon name="travel_explore" />
          Start research
        </Button>
      </div>
    </Modal>
  );
}

type LoadingModalProps = {
  isOpen: boolean;
};

export function LoadingResearchModal({ isOpen }: LoadingModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Researching person..." size="sm">
      <div className="py-8 text-center">
        <div className="flex justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <p className="mt-4 text-body-md text-on-surface-variant">This may take a few seconds.</p>
      </div>
    </Modal>
  );
}

type ReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  result: PersonResearchResult;
  saveForLater: boolean;
  onDiscard: () => void;
  onSave: () => void;
  onMarkWrong?: () => void;
  isSaving: boolean;
};

export function ReviewResearchModal({
  isOpen,
  onClose,
  result,
  saveForLater,
  onDiscard,
  onSave,
  onMarkWrong,
  isSaving,
}: ReviewModalProps) {
  const { person, research } = result;
  const [showAllExperience, setShowAllExperience] = useState(false);
  const [showAllEducation, setShowAllEducation] = useState(false);

  // Transform experience data to match JobHistoryTimeline format
  const experienceData: CompanyExperience[] = (research.experience || []).map((exp: any) => {
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
    <Modal isOpen={isOpen} onClose={onClose} title="Review research result" size="lg">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          {person.avatarUrl ? (
            <img src={person.avatarUrl} alt={person.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
              <MaterialIcon name="person" className="text-[32px]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-title-md text-title-md font-bold">{person.name}</h3>
            {person.title || person.company ? (
              <p className="mt-1 text-body-md text-on-surface-variant">
                {person.title}
                {person.title && person.company ? " · " : ""}
                {person.company}
              </p>
            ) : null}
            {person.linkedinUrl ? (
              <a
                href={person.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-primary transition-colors hover:text-primary/80"
              >
                <MaterialIcon name="open_in_new" className="flex-shrink-0" />
                <span className="underline">LinkedIn</span>
              </a>
            ) : null}
          </div>
        </div>

        {research.about ? (
          <div>
            <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">About</h3>
            <p className="mt-2 whitespace-pre-line text-body-md text-on-surface-variant">{research.about}</p>
          </div>
        ) : null}

        {experienceData.length > 0 ? (
          <div>
            <h3 className="mb-4 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
              Experience
            </h3>
            <JobHistoryTimeline companies={showAllExperience ? experienceData : experienceData.slice(0, 2)} />
            {experienceData.length > 2 ? (
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
            ) : null}
          </div>
        ) : null}

        {research.education && research.education.length > 0 ? (
          <div>
            <h3 className="mb-4 font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">
              Education
            </h3>
            <div className="space-y-6">
              {research.education.slice(0, showAllEducation ? undefined : 2).map(
                (
                  edu: {
                    institution: string;
                    degree?: string;
                    dates?: string;
                  },
                  index: number
                ) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-surface-container" />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-body-lg font-bold text-on-surface">{edu.institution}</h4>
                      {edu.degree ? <p className="mt-0.5 text-body-sm text-on-surface-variant">{edu.degree}</p> : null}
                      {edu.dates ? <p className="mt-0.5 text-body-sm text-on-surface-variant">{edu.dates}</p> : null}
                    </div>
                  </div>
                )
              )}
            </div>
            {research.education.length > 2 ? (
              <button
                type="button"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-surface-container-lowest px-4 py-2.5 text-body-md font-medium text-on-surface transition-all duration-200 hover:bg-surface-container"
                onClick={() => setShowAllEducation(!showAllEducation)}
              >
                <span className={`transition-transform duration-300 ${showAllEducation ? "rotate-180" : "rotate-0"}`}>
                  <ChevronDown className="h-4 w-4" />
                </span>
                {showAllEducation ? "Show less" : `Show ${research.education.length - 2} more`}
              </button>
            ) : null}
          </div>
        ) : null}

        {research.skills && research.skills.length > 0 ? (
          <div>
            <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {research.skills.slice(0, 20).map((skill: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex rounded-md border border-outline-variant bg-surface-container-lowest px-2.5 py-1 text-body-xs font-medium text-on-surface-variant"
                >
                  {skill}
                </span>
              ))}
              {research.skills.length > 20 ? (
                <span className="inline-flex items-center rounded-md border border-outline bg-surface-container px-2.5 py-1 text-body-xs font-medium text-on-surface-variant">
                  +{research.skills.length - 20} more
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {research.sources && research.sources.length > 0 ? (
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-lowest p-4">
            <h3 className="font-title-sm text-title-sm font-bold uppercase tracking-wide text-on-surface">Sources</h3>
            <div className="mt-2 space-y-1">
              {research.sources.map((source: { label: string; url: string }, index: number) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-body-sm text-primary hover:underline"
                >
                  <MaterialIcon name="open_in_new" className="text-[14px]" />
                  {source.label}
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        {onMarkWrong ? (
          <button type="button" className="btn btn-secondary text-error hover:bg-error-container" onClick={onMarkWrong}>
            <MaterialIcon name="person_remove" />
            Wrong person
          </button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={onDiscard}>
            Discard
          </Button>
          <LoadingButton className="btn btn-primary" loading={isSaving} loadingLabel="Saving..." onClick={onSave}>
            <MaterialIcon name="save" />
            {saveForLater ? "Save research" : "Done"}
          </LoadingButton>
        </div>
      </div>
    </Modal>
  );
}

type ErrorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  message?: string;
};

export function ResearchErrorModal({ isOpen, onClose, onRetry, message }: ErrorModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Research failed" size="sm">
      <div className="py-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error">
            <MaterialIcon name="error" filled className="text-[40px]" />
          </div>
        </div>
        <p className="mt-4 text-body-md text-on-surface-variant">
          {message || "Couldn't research this person. Please try again or add a LinkedIn URL."}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onRetry}>
          <MaterialIcon name="refresh" />
          Try again
        </Button>
      </div>
    </Modal>
  );
}
