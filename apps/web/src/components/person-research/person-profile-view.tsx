import { MaterialIcon } from "@interviews-tracker/design-system";
import { Badge } from "../badge";

type PersonWithResearch = {
  id: string;
  name: string;
  email: string | null;
  linkedinUrl: string | null;
  title: string | null;
  company: string | null;
  avatarUrl: string | null;
  research: {
    about: string | null;
    experience: Array<{
      company: string;
      title: string;
      dates?: string;
      duration?: string;
    }> | null;
    education: Array<{
      institution: string;
      degree?: string;
      dates?: string;
    }> | null;
    skills: string[] | null;
    sources: Array<{
      label: string;
      url: string;
    }> | null;
    updatedAt: string;
  } | null;
};

type PersonProfileViewProps = {
  person: PersonWithResearch;
  onUpdateResearch?: () => void;
};

export function PersonProfileView({ person, onUpdateResearch }: PersonProfileViewProps) {
  const { research } = person;
  const hasResearch = !!research;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-outline-variant bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt={person.name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                <MaterialIcon name="person" className="text-[40px]" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-headline-md text-headline-md font-bold">{person.name}</h1>
                {hasResearch ? <Badge tone="green">Researched</Badge> : null}
              </div>
              {person.title || person.company ? (
                <p className="mt-1 text-body-lg text-on-surface-variant">
                  {person.title}
                  {person.title && person.company ? " · " : ""}
                  {person.company}
                </p>
              ) : null}
              {person.email ? (
                <a href={`mailto:${person.email}`} className="mt-2 flex items-center gap-1 text-body-md text-primary hover:underline">
                  <MaterialIcon name="email" className="text-[18px]" />
                  {person.email}
                </a>
              ) : null}
              {person.linkedinUrl ? (
                <a
                  href={person.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex items-center gap-1 text-body-md text-primary hover:underline"
                >
                  <MaterialIcon name="open_in_new" className="text-[18px]" />
                  LinkedIn Profile
                </a>
              ) : null}
            </div>
          </div>
          {onUpdateResearch ? (
            <button type="button" className="btn btn-secondary" onClick={onUpdateResearch}>
              <MaterialIcon name="refresh" />
              Update research
            </button>
          ) : null}
        </div>
      </div>

      {hasResearch ? (
        <div className="space-y-6">
          {research.about ? (
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="label">About</h2>
              <p className="mt-3 whitespace-pre-line text-body-md text-on-surface-variant">{research.about}</p>
            </div>
          ) : null}

          {research.experience && research.experience.length > 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="label">Experience</h2>
              <div className="mt-4 space-y-5">
                {research.experience.map((exp, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
                      <MaterialIcon name="work" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-title-sm text-title-sm font-bold">{exp.company}</p>
                      <p className="mt-1 text-body-md text-on-surface-variant">{exp.title}</p>
                      {exp.dates || exp.duration ? (
                        <p className="mt-1 text-body-sm text-on-surface-variant">
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
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="label">Education</h2>
              <div className="mt-4 space-y-5">
                {research.education.map((edu, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <MaterialIcon name="school" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-title-sm text-title-sm font-bold">{edu.institution}</p>
                      {edu.degree ? <p className="mt-1 text-body-md text-on-surface-variant">{edu.degree}</p> : null}
                      {edu.dates ? <p className="mt-1 text-body-sm text-on-surface-variant">{edu.dates}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {research.skills && research.skills.length > 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="label">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {research.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="rounded-full bg-surface-container-high px-4 py-2 font-label-md text-label-md text-on-surface-variant"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {research.sources && research.sources.length > 0 ? (
            <div className="rounded-2xl border border-outline-variant bg-white p-6">
              <h2 className="label">Sources</h2>
              <div className="mt-3 space-y-2">
                {research.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-body-md text-primary hover:underline"
                  >
                    <MaterialIcon name="open_in_new" className="text-[18px]" />
                    {source.label}
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {research.updatedAt ? (
            <p className="text-center text-body-sm text-on-surface-variant">
              Last updated: {new Date(research.updatedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-outline-variant bg-white p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
            <MaterialIcon name="person_search" className="text-[40px]" />
          </div>
          <h3 className="mt-4 font-title-md text-title-md font-bold">No research available</h3>
          <p className="mt-2 text-body-md text-on-surface-variant">
            Research this person to see their professional background and experience.
          </p>
        </div>
      )}
    </div>
  );
}
