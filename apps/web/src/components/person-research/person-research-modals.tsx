import { useState } from "react";
import { Modal, LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";
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
                className="mt-2 inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
              >
                <MaterialIcon name="open_in_new" className="text-[16px]" />
                LinkedIn
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
              <p className="mt-1 text-body-sm text-on-surface-variant">
                Adding a LinkedIn URL can improve accuracy.
              </p>
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
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={validateAndStart}>
          <MaterialIcon name="travel_explore" />
          Start research
        </button>
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
        <p className="mt-4 text-body-md text-on-surface-variant">
          This may take a few seconds.
        </p>
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
  isSaving: boolean;
};

export function ReviewResearchModal({ isOpen, onClose, result, saveForLater, onDiscard, onSave, isSaving }: ReviewModalProps) {
  const { person, research } = result;

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
                className="mt-2 inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
              >
                <MaterialIcon name="open_in_new" className="text-[16px]" />
                LinkedIn
              </a>
            ) : null}
          </div>
        </div>

        {research.about ? (
          <div>
            <h4 className="label">About</h4>
            <p className="mt-2 whitespace-pre-line text-body-md text-on-surface-variant">{research.about}</p>
          </div>
        ) : null}

        {research.experience && research.experience.length > 0 ? (
          <div>
            <h4 className="label">Experience</h4>
            <div className="mt-3 space-y-4">
              {research.experience.map((exp: { company: string; title: string; dates?: string; duration?: string }, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-tertiary/10 text-tertiary">
                    <MaterialIcon name="work" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md font-bold">{exp.company}</p>
                    <p className="mt-0.5 text-body-md text-on-surface-variant">{exp.title}</p>
                    {exp.dates || exp.duration ? (
                      <p className="mt-0.5 text-body-sm text-on-surface-variant">
                        {exp.dates}
                        {exp.dates && exp.duration ? " · " : ""}
                        {exp.duration}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {research.education && research.education.length > 0 ? (
          <div>
            <h4 className="label">Education</h4>
            <div className="mt-3 space-y-4">
              {research.education.map((edu: { institution: string; degree?: string; dates?: string }, index: number) => (
                <div key={index} className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                    <MaterialIcon name="school" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-label-md text-label-md font-bold">{edu.institution}</p>
                    {edu.degree ? <p className="mt-0.5 text-body-md text-on-surface-variant">{edu.degree}</p> : null}
                    {edu.dates ? <p className="mt-0.5 text-body-sm text-on-surface-variant">{edu.dates}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {research.skills && research.skills.length > 0 ? (
          <div>
            <h4 className="label">Skills</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {research.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="rounded-full bg-surface-container-high px-3 py-1.5 text-body-sm text-on-surface-variant"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {research.sources && research.sources.length > 0 ? (
          <div className="rounded-lg bg-surface-container-low p-4">
            <h4 className="label">Sources</h4>
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

      <div className="mt-6 flex items-center justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onDiscard}>
          Discard
        </button>
        <LoadingButton
          className="btn btn-primary"
          loading={isSaving}
          loadingLabel="Saving..."
          onClick={onSave}
        >
          <MaterialIcon name="save" />
          {saveForLater ? "Save research" : "Done"}
        </LoadingButton>
      </div>
    </Modal>
  );
}

type ErrorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
};

export function ResearchErrorModal({ isOpen, onClose, onRetry }: ErrorModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Research failed" size="sm">
      <div className="py-4 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error">
            <MaterialIcon name="error" filled className="text-[40px]" />
          </div>
        </div>
        <p className="mt-4 text-body-md text-on-surface-variant">
          Couldn't research this person. Please try again or add a LinkedIn URL.
        </p>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          <MaterialIcon name="refresh" />
          Try again
        </button>
      </div>
    </Modal>
  );
}
