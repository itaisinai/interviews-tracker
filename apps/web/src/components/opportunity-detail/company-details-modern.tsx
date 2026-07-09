import { useState } from "react";

import { CompactInfoRow, MaterialIcon, SectionHeader } from "@interviews-tracker/design-system";

import type { Opportunity } from "../../lib/types";

type CompanyDetailsModernProps = {
  opportunity: Opportunity;
  className?: string;
};

export function CompanyDetailsModern({ opportunity, className = "" }: CompanyDetailsModernProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overview"]));

  const toggleSection = (section: string) => {
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  return (
    <section className={className}>
      <SectionHeader title="Company Details" subtitle={`${opportunity.company.name} • ${opportunity.roleTitle}`} />

      <div className="mt-6 space-y-6">
        <CollapsibleSection
          title="Overview"
          icon="business"
          isExpanded={expandedSections.has("overview")}
          onToggle={() => toggleSection("overview")}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {opportunity.linkedinUrl && (
              <CompactInfoRow
                label="LinkedIn"
                value={
                  <a
                    href={opportunity.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                  >
                    View profile
                    <MaterialIcon name="open_in_new" className="text-[14px]" />
                  </a>
                }
              />
            )}
            <CompactInfoRow label="Stage" value={opportunity.company.companyStage?.label || "Not specified"} />
            <CompactInfoRow label="Size" value={opportunity.company.employeesRange?.label || "Not specified"} />
            <CompactInfoRow label="Location" value={opportunity.company.location || "Not specified"} />
            <CompactInfoRow label="Work Model" value={opportunity.workModel?.label || "Not specified"} />
            <CompactInfoRow label="Funding" value={opportunity.company.funding || "Not specified"} />
          </div>

          {opportunity.company.description && (
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">About Company</div>
              <p className="text-sm leading-relaxed text-neutral-700">{opportunity.company.description}</p>
            </div>
          )}

          {opportunity.company.productDescription && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Product</div>
              <p className="text-sm leading-relaxed text-neutral-700">{opportunity.company.productDescription}</p>
            </div>
          )}

          {opportunity.company.customersTraction && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">Traction</div>
              <p className="text-sm leading-relaxed text-neutral-700">{opportunity.company.customersTraction}</p>
            </div>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Tech Stack"
          icon="code"
          isExpanded={expandedSections.has("tech")}
          onToggle={() => toggleSection("tech")}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CompactInfoRow label="Technologies" value={opportunity.company.techStack || "Not specified"} />
            <CompactInfoRow
              label="Backend / Frontend"
              value={opportunity.company.backendFrontendSplit || "Not specified"}
            />
            {opportunity.domains.length > 0 && (
              <CompactInfoRow
                label="Domains"
                value={
                  <div className="flex flex-wrap gap-1">
                    {opportunity.domains.map((item) => (
                      <span
                        key={item.domain.id}
                        className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                      >
                        {item.domain.label}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Role Details"
          icon="work"
          isExpanded={expandedSections.has("role")}
          onToggle={() => toggleSection("role")}
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {opportunity.jobUrl && (
              <CompactInfoRow
                label="Job Posting"
                value={
                  <a
                    href={opportunity.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:underline"
                  >
                    View posting
                    <MaterialIcon name="open_in_new" className="text-[14px]" />
                  </a>
                }
              />
            )}
          </div>

          {opportunity.compensationNotes && (
            <div className="mt-4 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                Compensation Notes
              </div>
              <p className="text-sm leading-relaxed text-neutral-700">{opportunity.compensationNotes}</p>
            </div>
          )}

          {opportunity.notes && (
            <div className="mt-3 rounded-lg bg-neutral-50 p-4">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">General Notes</div>
              <p className="text-sm leading-relaxed text-neutral-700">{opportunity.notes}</p>
            </div>
          )}
        </CollapsibleSection>

        {opportunity.nextStep && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-emerald-700">
              <MaterialIcon name="flag" className="text-[16px]" />
              Next Step
            </div>
            <p className="text-sm font-medium leading-relaxed text-neutral-900">{opportunity.nextStep}</p>
          </div>
        )}
      </div>
    </section>
  );
}

type CollapsibleSectionProps = {
  title: string;
  icon: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function CollapsibleSection({ title, icon, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MaterialIcon name={icon} className="text-[18px]" />
          </div>
          <span className="font-semibold text-neutral-900">{title}</span>
        </div>
        <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} className="text-[20px] text-neutral-400" />
      </button>
      {isExpanded && <div className="border-t border-neutral-100 p-4">{children}</div>}
    </div>
  );
}
