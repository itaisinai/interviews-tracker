import { labelForPipelineType } from "../../lib/enum-labels";
import type { Opportunity } from "../../lib/types";
import { Badge } from "../badge";
import { CompanyResearchPanel } from "../company-research-panel";
import { GmailInteractionPanel } from "../gmail-interaction-panel";
import { InteractionInputChooser, type InteractionInputMode } from "../interaction-input-chooser";
import { InteractionTextParserPanel } from "../interactions-drawer/interaction-text-parser-panel";
import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";
import { ArrowLeft } from "lucide-react";

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
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">
              Company data
            </p>
            <h2 className="mt-1 font-title-lg text-title-lg font-bold text-on-background">
              {opportunity.companyName}
            </h2>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {opportunity.roleTitle}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge value={opportunity.status} />
              <Badge value={opportunity.priority} />
              <Badge value={opportunity.pipelineType}>
                {labelForPipelineType(opportunity.pipelineType)}
              </Badge>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <LoadingButton
              className={showResearch ? "btn btn-primary" : "btn btn-secondary"}
              icon="travel_explore"
              onClick={onToggleResearch}
            >
              {showResearch ? "Hide company research" : "Company research"}
            </LoadingButton>
            <LoadingButton
              className={
                showInteractionInput ? "btn btn-primary" : "btn btn-secondary"
              }
              icon="add"
              onClick={onToggleInteractionInput}
            >
              {showInteractionInput ? "Hide add interaction" : "Add interaction"}
            </LoadingButton>
          </div>
        </div>
      </section>

      {showResearch ? (
        <div className="mt-6">
          <CompanyResearchPanel
            companyName={opportunity.companyName}
            roleTitle={opportunity.roleTitle}
            knownContext={`Status: ${opportunity.status} · Pipeline: ${opportunity.pipelineType} · Next step: ${opportunity.nextStep ?? "None"}${opportunity.notes ? ` · Notes: ${opportunity.notes}` : ""}`}
            existingCompanyData={{
              companySearchName: opportunity.companySearchName ?? null,
              funding: opportunity.funding ?? null,
              customersTraction: opportunity.customersTraction ?? null,
              companyDescription: opportunity.companyDescription ?? null,
              productDescription: opportunity.productDescription ?? null,
              location: opportunity.location ?? null,
              employees: opportunity.employeesRange?.label ?? null,
            }}
            targetOpportunityId={opportunity.id}
            onSaved={onSaved}
          />
        </div>
      ) : null}

      {showInteractionInput === "chooser" ? (
        <section className="panel mt-6 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                Add interaction
              </p>
              <h4 className="font-title-md text-title-md font-bold">
                Choose input method
              </h4>
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
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                Add interaction
              </p>
              <h4 className="font-title-md text-title-md font-bold">Gmail import</h4>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onSelectInteractionInputMode("chooser")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <GmailInteractionPanel
            opportunityId={opportunity.id}
            companyName={opportunity.companyName}
            roleTitle={opportunity.roleTitle}
            onSaved={onSaved}
          />
        </section>
      ) : null}

      {showInteractionInput === "text" ? (
        <section className="panel mt-6 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                Add interaction
              </p>
              <h4 className="font-title-md text-title-md font-bold">Text parser</h4>
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => onSelectInteractionInputMode("chooser")}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
          <InteractionTextParserPanel
            opportunityId={opportunity.id}
            companyName={opportunity.companyName}
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
            <Detail
              label="English Search Name"
              value={opportunity.companySearchName}
            />
            <Detail label="Size" value={opportunity.employeesRange?.label} />
            <Detail label="Stage" value={opportunity.companyStage?.label} />
            <Detail
              label="Domains"
              value={opportunity.domains
                .map((item) => item.domain.label)
                .join(", ")}
            />
            <Detail label="Work Model" value={opportunity.workModel?.label} />
            <Detail label="Location" value={opportunity.location} />
            <Detail label="Funding" value={opportunity.funding} />
            <Detail label="Company" value={opportunity.companyDescription} />
            <Detail label="Product" value={opportunity.productDescription} />
          </div>

          <div className="lg:col-span-4">
            <SectionTitle title="Role Details" icon="work" />
            <div className="mt-4">
              <p className="label">Job Posting</p>
              {opportunity.jobUrl ? (
                <a
                  className="mt-1 inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
                  href={opportunity.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MaterialIcon name="open_in_new" className="text-[18px]" />
                  Open job posting
                </a>
              ) : (
                <p className="mt-1 text-body-md text-on-surface-variant">-</p>
              )}
            </div>
            <Detail label="Tech Stack" value={opportunity.techStack} />
            <Detail
              label="Backend / Frontend"
              value={opportunity.backendFrontendSplit}
            />
            <Detail label="Traction" value={opportunity.customersTraction} />
            <Detail
              label="Compensation Notes"
              value={opportunity.compensationNotes}
            />
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
      <p className="mt-1 text-body-md text-on-surface-variant">
        {value || "-"}
      </p>
    </div>
  );
}
