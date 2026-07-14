import { ArrowLeft } from "lucide-react";

import { Button, IconLink, MaterialIcon } from "@interviews-tracker/design-system";

import { labelForPipelineType } from "../../lib/enum-labels";
import type { Opportunity } from "../../lib/types";
import { Badge } from "../badge";
import { CompanyResearchPanel } from "../company-research-panel";
import { GmailInteractionPanel } from "../gmail-interaction-panel";
import { InteractionInputChooser, type InteractionInputMode } from "../interaction-input-chooser";
import { InteractionTextParserPanel } from "../interactions-drawer/interaction-text-parser-panel";

type CompanyDataSectionProps = {
  opportunity: Opportunity;
  showResearch: boolean;
  showInteractionInput: InteractionInputMode;
  onToggleResearch: () => void;
  onToggleInteractionInput: () => void;
  onSelectInteractionInputMode: (mode: InteractionInputMode) => void;
  onSaved: () => void;
};

export function CompanyDataSection({
  opportunity,
  showResearch,
  showInteractionInput,
  onToggleResearch,
  onToggleInteractionInput,
  onSelectInteractionInputMode,
  onSaved,
}: CompanyDataSectionProps) {
  return (
    <>
      <section className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">Company data</p>
            <h2 className="mt-1 font-title-lg text-title-lg font-bold text-on-background">
              {opportunity.company.name}
            </h2>
            <p className="mt-1 text-body-md text-on-surface-variant">{opportunity.roleTitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge value={opportunity.status} />
              <Badge value={opportunity.pipelineType}>{labelForPipelineType(opportunity.pipelineType)}</Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              className={showResearch ? "btn btn-primary" : "btn btn-secondary"}
              leadingIcon="travel_explore"
              onClick={onToggleResearch}
            >
              {showResearch ? "Hide company research" : "Company research"}
            </Button>
            <Button
              className={showInteractionInput ? "btn btn-primary" : "btn btn-secondary"}
              leadingIcon="add"
              onClick={onToggleInteractionInput}
            >
              {showInteractionInput ? "Hide add interaction" : "Add interaction"}
            </Button>
          </div>
        </div>
      </section>

      {showResearch ? (
        <div className="mt-6">
          <CompanyResearchPanel
            companySlugOrId={opportunity.company.slug}
            companyName={opportunity.company.name}
            roleTitle={opportunity.roleTitle}
            knownContext={`Status: ${opportunity.status} · Pipeline: ${opportunity.pipelineType} · Next step: ${opportunity.nextStep ?? "None"}${opportunity.notes ? ` · Notes: ${opportunity.notes}` : ""}`}
            existingCompanyData={{
              companySearchName: opportunity.company.searchName ?? null,
              funding: opportunity.company.funding ?? null,
              customersTraction: opportunity.company.customersTraction ?? null,
              companyDescription: opportunity.company.description ?? null,
              productDescription: opportunity.company.productDescription ?? null,
              location: opportunity.company.location ?? null,
              employees: opportunity.company.employeesRange?.label ?? null,
            }}
            targetOpportunitySlug={opportunity.slug}
            onSaved={onSaved}
          />
        </div>
      ) : null}

      {showInteractionInput === "chooser" ? (
        <section className="panel mt-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Add interaction</p>
              <h4 className="font-title-md text-title-md font-bold">Choose input method</h4>
            </div>
          </div>
          <div className="mt-4">
            <InteractionInputChooser onSelectMode={onSelectInteractionInputMode} />
          </div>
        </section>
      ) : null}

      {showInteractionInput === "gmail" ? (
        <section className="panel mt-6 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Add interaction</p>
              <h4 className="font-title-md text-title-md font-bold">Gmail import</h4>
            </div>
            <Button variant="secondary" onClick={() => onSelectInteractionInputMode("chooser")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <GmailInteractionPanel
            opportunitySlug={opportunity.slug}
            companyName={opportunity.company.name}
            roleTitle={opportunity.roleTitle}
            onSaved={onSaved}
          />
        </section>
      ) : null}

      {showInteractionInput === "text" ? (
        <section className="panel mt-6 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Add interaction</p>
              <h4 className="font-title-md text-title-md font-bold">Text parser</h4>
            </div>
            <Button variant="secondary" onClick={() => onSelectInteractionInputMode("chooser")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <InteractionTextParserPanel
            opportunitySlug={opportunity.slug}
            companyName={opportunity.company.name}
            roleTitle={opportunity.roleTitle}
            onSaved={onSaved}
          />
        </section>
      ) : null}

      <section className="panel mt-6 p-6">
        <div className="grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionTitle title="Company Details" icon="business" />
            <Detail label="LinkedIn" value={opportunity.linkedinUrl} />
            <Detail label="English Search Name" value={opportunity.company.searchName} />
            <Detail label="Size" value={opportunity.company.employeesRange?.label} />
            <Detail label="Stage" value={opportunity.company.companyStage?.label} />
            <Detail label="Domains" value={opportunity.domains.map((item) => item.domain.label).join(", ")} />
            <Detail label="Work Model" value={opportunity.workModel?.label} />
            <Detail label="Location" value={opportunity.company.location} />
            <Detail label="Funding" value={opportunity.company.funding} />
            <Detail label="Company" value={opportunity.company.description} />
            <Detail label="Product" value={opportunity.company.productDescription} />
          </div>

          <div className="lg:col-span-4">
            <SectionTitle title="Role Details" icon="work" />
            <div className="mt-4">
              <p className="label">Job Posting</p>
              {opportunity.jobUrl ? (
                <div className="mt-1">
                  <IconLink href={opportunity.jobUrl}>Open job posting</IconLink>
                </div>
              ) : (
                <p className="mt-1 text-body-md text-on-surface-variant">-</p>
              )}
            </div>
            <Detail label="Tech Stack" value={opportunity.company.techStack} />
            <Detail label="Backend / Frontend" value={opportunity.company.backendFrontendSplit} />
            <Detail label="Traction" value={opportunity.company.customersTraction} />
            <Detail label="Compensation Notes" value={opportunity.compensationNotes} />
            <Detail label="General Notes" value={opportunity.notes} />
          </div>

          <div className="lg:col-span-4">
            <SectionTitle title="Next Step" icon="flag" />
            <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-body-md font-medium text-on-background">
              {opportunity.nextStep ?? "No next step set."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-2">
      <MaterialIcon name={icon} className="text-primary" />
      <h3 className="font-title-md text-title-md font-bold">{title}</h3>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      <p className="mt-1 text-body-md text-on-surface-variant">{value || "-"}</p>
    </div>
  );
}
