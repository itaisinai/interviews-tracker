import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { CompanyResearchPanel } from "../company-research-panel";
import { InteractionsDrawer } from "../interactions-drawer";
import { OpportunityInteractionTimeline } from "../interactions-timeline";
import { Badge } from "../badge";
import { CompanyFactsStrip } from "./company-facts-strip";
import { CompanySummaryCard } from "./company-summary-card";
import { buildSelectedOpportunityForInteraction } from "../../pages/interactions-page-selection";
import { promoteOverdueInteractionsForRead } from "../../lib/interaction-status";
import type { CompanyDetail } from "../../lib/types";
import type { CompanyResearchResult } from "../../lib/types";
import {
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
} from "@interviews-tracker/design-system";

type CompanyDetailViewProps = {
  company: CompanyDetail;
  isRefreshing: boolean;
  isDeletingCompany: boolean;
  onDeleteCompany: () => void;
  onDeleteInteraction: (interactionId: string) => void;
  isDeletingInteraction: (interactionId: string) => boolean;
  onResearchSaved?: (research: CompanyResearchResult) => void;
  referenceDate?: Date;
};

export function CompanyDetailView({
  company,
  isRefreshing,
  isDeletingCompany,
  onDeleteCompany,
  onDeleteInteraction,
  isDeletingInteraction,
  onResearchSaved,
  referenceDate = new Date(),
}: CompanyDetailViewProps) {
  const queryClient = useQueryClient();
  const [showResearch, setShowResearch] = useState(false);
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);

  const displayInteractions = useMemo(
    () => promoteOverdueInteractionsForRead(company.interactions),
    [company.interactions],
  );
  const opportunitiesWithInteractions = useMemo(() => {
    return [...company.opportunities]
      .map((opportunity) => ({
        ...opportunity,
        interactions: displayInteractions.filter(
          (interaction) => interaction.jobOpportunityId === opportunity.id,
        ),
      }))
      .sort((left, right) => {
        const leftLast = left.interactions.at(-1)?.date ?? left.updatedAt;
        const rightLast = right.interactions.at(-1)?.date ?? right.updatedAt;

        return new Date(rightLast).getTime() - new Date(leftLast).getTime();
      });
  }, [company.opportunities, displayInteractions]);

  const selectedInteraction = useMemo(
    () => displayInteractions.find((item) => item.id === selectedInteractionId) ?? null,
    [displayInteractions, selectedInteractionId],
  );
  const selectedOpportunity = useMemo(
    () =>
      selectedInteraction
        ? buildSelectedOpportunityForInteraction(
            selectedInteraction,
            displayInteractions,
            company.opportunities,
          )
        : null,
    [company.opportunities, displayInteractions, selectedInteraction],
  );

  useEffect(() => {
    if (
      selectedInteractionId &&
      !displayInteractions.some((item) => item.id === selectedInteractionId)
    ) {
      setSelectedInteractionId(null);
    }
  }, [displayInteractions, selectedInteractionId]);

  const primary = company.opportunities[0];
  const domains = [
    ...new Set(
      company.opportunities.flatMap((item) =>
        item.domains.map((domain) => domain.domain.label),
      ),
    ),
  ];
  const summaryDomain = domains.find((domain) => !domain.includes(".")) ?? domains[0] ?? "-";
  const summaryFacts = [
    { label: "Industry", value: summaryDomain, icon: "work" },
    { label: "Location", value: primary?.location ?? "-", icon: "location_on" },
    { label: "Size", value: primary?.employeesRange?.label ?? "-", icon: "groups" },
    { label: "Stage", value: primary?.companyStage?.label ?? "-", icon: "route" },
    { label: "Funding", value: primary?.funding ?? "-", icon: "payments" },
    { label: "Domain", value: domains.join(", ") || "-", icon: "public" },
  ] as const;

  const researchExistingData = {
    companySearchName:
      company.opportunities.find((item) => Boolean(item.companySearchName?.trim()))
        ?.companySearchName ?? null,
    linkedinUrl:
      company.opportunities.find((item) => Boolean(item.linkedinUrl?.trim()))
        ?.linkedinUrl ?? primary?.linkedinUrl ?? null,
    funding:
      company.opportunities.find((item) => Boolean(item.funding?.trim()))?.funding ??
      null,
    customersTraction:
      company.opportunities.find((item) => Boolean(item.customersTraction?.trim()))
        ?.customersTraction ?? null,
    companyDescription:
      company.opportunities.find((item) => Boolean(item.companyDescription?.trim()))
        ?.companyDescription ?? null,
    productDescription:
      company.opportunities.find((item) => Boolean(item.productDescription?.trim()))
        ?.productDescription ?? null,
    location:
      company.opportunities.find((item) => Boolean(item.location?.trim()))?.location ??
      null,
    employees:
      company.opportunities.find((item) => Boolean(item.employeesRange?.label?.trim()))
        ?.employeesRange?.label ?? null,
  };

  const researchContext = `Roles: ${company.opportunities.length} · Interactions: ${company.interactions.length} · Domains: ${domains.join(", ") || "None"}`;

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate font-title-lg text-title-lg font-bold text-on-background">
              {company.companyName}
            </h1>
            <Badge tone="green">
              {primary?.pipelineType === "ACTIVE_PROCESS"
                ? "In process"
                : primary?.status === "RESEARCH_LEAD"
                  ? "In research"
                  : primary?.status ?? "In research"}
            </Badge>
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {company.opportunities.length} role
            {company.opportunities.length === 1 ? "" : "s"} · {company.interactions.length} interaction
            {company.interactions.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isRefreshing ? <InlineLoadingState label="Refreshing" /> : null}
          <LoadingButton
            className="btn btn-secondary text-error hover:bg-error-container"
            loading={isDeletingCompany}
            loadingLabel="Deleting..."
            icon="delete"
            onClick={() => {
              if (
                window.confirm(
                  `Delete ${company.companyName} and all its opportunities/interactions?`,
                )
              ) {
                onDeleteCompany();
              }
            }}
          >
            Delete Company
          </LoadingButton>
          <Link className="btn btn-secondary" to="/companies">
            <MaterialIcon name="arrow_back" />
            Companies
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <CompanyFactsStrip
          facts={summaryFacts.map((fact) => ({
            label: fact.label,
            value: fact.value,
            icon: fact.icon,
          }))}
          onResearchClick={() => setShowResearch((value) => !value)}
        />
      </div>

      {showResearch ? (
        <section className="panel mt-4 p-5">
          <CompanyResearchPanel
            companyName={company.companyName}
            knownContext={researchContext}
            existingCompanyData={researchExistingData}
            onSaved={(research) => {
              void queryClient.invalidateQueries({ queryKey: ["company", company.companyName] });
              void queryClient.invalidateQueries({ queryKey: ["companies"] });
              void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
              onResearchSaved?.(research);
            }}
          />
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-title-md text-title-md font-bold">
                Opportunity Timelines
              </h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                All roles and their interactions in one place.
              </p>
            </div>
            <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
              {opportunitiesWithInteractions.length}{" "}
              {opportunitiesWithInteractions.length === 1
                ? "opportunity"
                : "opportunities"}
            </div>
          </div>

          <div className="space-y-4">
            {opportunitiesWithInteractions.map((item) => (
              <OpportunityInteractionTimeline
                key={item.id}
                companyName={item.companyName}
                roleTitle={item.roleTitle}
                interactions={item.interactions}
                selectedInteractionId={selectedInteractionId}
                onSelectInteraction={setSelectedInteractionId}
                onDeleteInteraction={onDeleteInteraction}
                isDeletingInteraction={isDeletingInteraction}
                opportunityHref={`/opportunities/${item.slug || item.id}`}
                defaultCollapsed={item.id !== opportunitiesWithInteractions[0]?.id}
                referenceDate={referenceDate}
              />
            ))}
          </div>
        </section>

        <div className="space-y-4 lg:col-span-4">
          <CompanySummaryCard
            title="Company Profile"
            defaultRows={3}
            rows={[
              { label: "English Search Name", value: primary?.companySearchName ?? "-" },
              { label: "Work Model", value: primary?.workModel?.label ?? "-" },
              { label: "Company", value: primary?.companyDescription ?? "-" },
            ]}
            moreRows={[
              { label: "Domains", value: domains.join(", ") || "-" },
              { label: "Location", value: primary?.location ?? "-" },
              { label: "Size", value: primary?.employeesRange?.label ?? "-" },
              { label: "Stage", value: primary?.companyStage?.label ?? "-" },
              { label: "Funding / Rounds", value: primary?.funding ?? "-" },
              { label: "Customers / Traction", value: primary?.customersTraction ?? "-" },
            ]}
          />

          <CompanySummaryCard
            title="Technical / Role Context"
            defaultRows={2}
            rows={[
              { label: "Tech Stack", value: primary?.techStack ?? "-" },
              { label: "Backend / Frontend Split", value: primary?.backendFrontendSplit ?? "-" },
            ]}
            moreRows={[
              { label: "Compensation Notes", value: primary?.compensationNotes ?? "-" },
              { label: "Research Notes", value: primary?.notes ?? "-" },
            ]}
          />
        </div>
      </div>

      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={selectedOpportunity}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}
