import { Link } from "react-router-dom";
import { Building2, FolderOpen, X } from "lucide-react";

import type { Interaction, Opportunity } from "../../lib/types";

type InteractionDrawerHeaderProps = {
  opportunity: Opportunity | null;
  interaction: Interaction;
  onClose: () => void;
};

export function InteractionDrawerHeader({
  opportunity,
  interaction,
  onClose,
}: InteractionDrawerHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-white px-5 py-4">
      <div className="min-w-0">
        <p className="font-label-md text-label-md uppercase text-on-surface-variant">
          Interaction details
        </p>
        <h3 className="truncate font-title-md text-title-md font-bold">
          {opportunity?.companyName ??
            interaction.jobOpportunity?.companyName ??
            "Interaction"}
        </h3>
        <p className="truncate text-body-md text-on-surface-variant">
          {opportunity?.roleTitle ??
            interaction.jobOpportunity?.roleTitle ??
            "-"}
        </p>
      </div>
      <div className="flex items-start gap-2">
        {opportunity?.companyName ? (
          <Link
            className="btn btn-secondary"
            to={`/companies/${encodeURIComponent(opportunity.companyName)}`}
            title={`Open ${opportunity.companyName} company page`}
          >
            <Building2 className="h-4 w-4" />
            Company
          </Link>
        ) : null}
        {opportunity ? (
          <Link
            className="btn btn-secondary"
            to={`/opportunities/${opportunity.id}`}
            title="Open opportunity details"
          >
            <FolderOpen className="h-4 w-4" />
            Opportunity
          </Link>
        ) : null}
        <button className="btn btn-secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </button>
      </div>
    </div>
  );
}
