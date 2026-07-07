import { GmailInteractionPanel } from "../gmail-interaction-panel";
import type { Opportunity } from "../../lib/types";
import { Field } from "./field";
import { MaterialIcon } from "@interviews-tracker/design-system";

type GmailImportPanelProps = {
  opportunities: Opportunity[];
  selectedOpportunityId: string;
  selectedOpportunity: Opportunity | null;
  onSelectOpportunity: (opportunityId: string) => void;
  onClose?: () => void;
  onSaved: () => void;
  variant: "mobile" | "desktop";
};

export function GmailImportPanel({
  opportunities,
  selectedOpportunityId,
  selectedOpportunity,
  onSelectOpportunity,
  onClose,
  onSaved,
  variant,
}: GmailImportPanelProps) {
  if (variant === "mobile") {
    return (
      <section className="mb-5 rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
        <Header description="Pick an opportunity, search Gmail, then review before saving." />
        <OpportunitySelect
          opportunities={opportunities}
          selectedOpportunityId={selectedOpportunityId}
          onSelectOpportunity={onSelectOpportunity}
        />
        <ImportBody selectedOpportunity={selectedOpportunity} onSaved={onSaved} />
      </section>
    );
  }

  return (
    <section className="panel mb-8 p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <MaterialIcon name="mail" />
        </div>
        <Header description="Pick an opportunity, search Gmail for recent emails, then review the parsed interaction before saving." />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <OpportunitySelect
          opportunities={opportunities}
          selectedOpportunityId={selectedOpportunityId}
          onSelectOpportunity={onSelectOpportunity}
        />
        {onClose ? (
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            <MaterialIcon name="close" />
            Close
          </button>
        ) : null}
      </div>
      <ImportBody selectedOpportunity={selectedOpportunity} onSaved={onSaved} />
    </section>
  );
}

function Header({ description }: { description: string }) {
  return (
    <div className="min-w-0">
      <h3 className="font-title-md text-title-md font-bold">
        Add interaction from Gmail
      </h3>
      <p className="mt-1 text-body-md text-on-surface-variant">{description}</p>
    </div>
  );
}

function OpportunitySelect({
  opportunities,
  selectedOpportunityId,
  onSelectOpportunity,
}: {
  opportunities: Opportunity[];
  selectedOpportunityId: string;
  onSelectOpportunity: (opportunityId: string) => void;
}) {
  return (
    <Field label="Opportunity">
      <select
        className="input"
        value={selectedOpportunityId}
        onChange={(event) => onSelectOpportunity(event.target.value)}
      >
        <option value="">Select company / role</option>
        {opportunities.map((item) => (
          <option key={item.id} value={item.id}>
            {item.company.name} · {item.roleTitle}
          </option>
        ))}
      </select>
    </Field>
  );
}

function ImportBody({
  selectedOpportunity,
  onSaved,
}: {
  selectedOpportunity: Opportunity | null;
  onSaved: () => void;
}) {
  if (!selectedOpportunity) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
        Choose an opportunity to search Gmail for related emails.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <GmailInteractionPanel
        opportunityId={selectedOpportunity.slug ?? selectedOpportunity.id}
        companyName={selectedOpportunity.company.name}
        roleTitle={selectedOpportunity.roleTitle}
        onSaved={onSaved}
      />
    </div>
  );
}
