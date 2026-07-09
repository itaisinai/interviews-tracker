import { Link } from "react-router-dom";

import { Building2, Maximize2, X } from "lucide-react";

import type { Interaction, Opportunity } from "../../lib/types";

type InteractionDrawerHeaderProps = {
  opportunity: Opportunity | null;
  interaction: Interaction;
  onClose: () => void;
  onOpenFullscreen?: () => void;
};

export function InteractionDrawerHeader({
  opportunity,
  interaction,
  onClose,
  onOpenFullscreen,
}: InteractionDrawerHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-white px-5 py-4">
      <div className="min-w-0">
        <p className="font-label-md text-label-md uppercase text-on-surface-variant">Interaction details</p>
        <h3 className="truncate font-title-md text-title-md font-bold">
          {opportunity?.company.name ?? interaction.jobOpportunity?.company.name ?? "Interaction"}
        </h3>
        <p className="truncate text-body-md text-on-surface-variant">
          {opportunity?.roleTitle ?? interaction.jobOpportunity?.roleTitle ?? "-"}
        </p>
      </div>
      <div className="flex items-start gap-2">
        {opportunity?.company.name ? (
          <Link
            className="btn btn-secondary"
            to={`/companies/${opportunity.company.slug}`}
            title={`Open ${opportunity.company.name} company page`}
          >
            <Building2 className="h-4 w-4" />
            Company
          </Link>
        ) : null}
        {onOpenFullscreen && (
          <button className="btn btn-secondary" onClick={onOpenFullscreen} title="Open in fullscreen">
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </button>
        )}
        <button className="btn btn-secondary" onClick={onClose}>
          <X className="h-4 w-4" />
          Close
        </button>
      </div>
    </div>
  );
}
