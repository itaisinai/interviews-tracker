import React, { useState } from "react";

export type JobPosition = {
  title: string;
  employmentType?: string;
  startDate: string;
  endDate: string;
  duration: string;
  location?: string;
  description?: string;
};

export type CompanyExperience = {
  companyName: string;
  companyLogo?: string;
  totalDuration: string;
  companyUrl?: string;
  positions: JobPosition[];
};

export type JobHistoryTimelineProps = {
  companies: CompanyExperience[];
};

type DescriptionProps = {
  text: string;
};

function ExpandableDescription({ text }: DescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-2">
      <p
        className={`text-body-sm text-on-surface-variant leading-relaxed ${
          isExpanded ? "" : "line-clamp-2"
        }`}
      >
        {text}
      </p>
      {text.length > 150 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-1 text-body-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
        >
          ...{isExpanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}

export function JobHistoryTimeline({ companies }: JobHistoryTimelineProps) {
  return (
    <div className="space-y-6">
      {companies.map((company, companyIndex) => (
        <div key={companyIndex} className="flex gap-3">
          {/* Company Logo */}
          {company.companyLogo ? (
            <img
              src={company.companyLogo}
              alt={company.companyName}
              className="h-12 w-12 flex-shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-surface-container" />
          )}

          <div className="min-w-0 flex-1">
            {company.positions.length === 1 ? (
              /* Single position - show job title as main, company as subtitle */
              <>
                {/* Job Title as main heading */}
                <h3 className="text-body-lg font-bold text-on-surface">
                  {company.positions[0].title}
                </h3>

                {/* Company name as subtitle */}
                {company.companyUrl ? (
                  <a
                    href={company.companyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 text-body-sm text-on-surface-variant transition-colors hover:text-primary"
                  >
                    {company.companyName}
                  </a>
                ) : (
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {company.companyName}
                  </p>
                )}

                {/* Dates and Duration */}
                <p className="mt-0.5 text-body-sm text-on-surface-variant">
                  {company.positions[0].startDate} - {company.positions[0].endDate} · {company.positions[0].duration}
                </p>

                {/* Employment Type */}
                {company.positions[0].employmentType && (
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {company.positions[0].employmentType}
                  </p>
                )}

                {/* Location */}
                {company.positions[0].location && (
                  <p className="mt-0.5 text-body-sm text-on-surface-variant">
                    {company.positions[0].location}
                  </p>
                )}

                {/* Description */}
                {company.positions[0].description && (
                  <ExpandableDescription text={company.positions[0].description} />
                )}
              </>
            ) : (
              /* Multiple positions - show company as main, then timeline */
              <>
                {/* Company Name and Total Duration */}
                {company.companyUrl ? (
                  <a
                    href={company.companyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-body-lg font-bold text-on-surface transition-colors hover:text-primary"
                  >
                    {company.companyName}
                  </a>
                ) : (
                  <h3 className="text-body-lg font-bold text-on-surface">
                    {company.companyName}
                  </h3>
                )}
                <p className="text-body-sm text-on-surface-variant">
                  {company.totalDuration}
                </p>

                <div className="relative mt-4">
                {/* Vertical line connecting positions */}
                <div className="absolute left-1.5 top-2 bottom-0 w-px bg-outline-variant" />

                <div className="space-y-4">
                  {company.positions.map((position, positionIndex) => (
                    <div key={positionIndex} className="relative flex gap-3">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-0.5 h-3 w-3 flex-shrink-0 rounded-full border-2 border-outline-variant bg-surface" />

                      <div className="min-w-0 flex-1 -mt-1 pb-2">
                        {/* Position Title */}
                        <h4 className="text-body-md font-bold text-on-surface">
                          {position.title}
                        </h4>

                        {/* Employment Type */}
                        {position.employmentType && (
                          <p className="mt-0.5 text-body-sm text-on-surface-variant">
                            {position.employmentType}
                          </p>
                        )}

                        {/* Dates and Duration */}
                        <p className="mt-0.5 text-body-sm text-on-surface-variant">
                          {position.startDate} - {position.endDate} · {position.duration}
                        </p>

                        {/* Location */}
                        {position.location && (
                          <p className="mt-0.5 text-body-sm text-on-surface-variant">
                            {position.location}
                          </p>
                        )}

                        {/* Description */}
                        {position.description && (
                          <ExpandableDescription text={position.description} />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
