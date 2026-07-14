import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useQueryClient } from "@tanstack/react-query";

import { Button, InlineLoadingState, MaterialIcon } from "@interviews-tracker/design-system";

import { getOpportunityProcessBadgeMeta, promoteOverdueInteractionsForRead } from "../../lib/interaction-status";
import type { CompanyDetail } from "../../lib/types";
import type { CompanyResearchResult } from "../../lib/types";
import { buildSelectedOpportunityForInteraction } from "../../pages/interactions-page-selection";
import { Badge } from "../badge";
import { CompanyResearchPanel } from "../company-research-panel";
import { InteractionsDrawer } from "../interactions-drawer";
import { OpportunityInteractionTimeline } from "../interactions-timeline";

import { CompanyFactsStrip } from "./company-facts-strip";
import { CompanySummaryCard } from "./company-summary-card";

type CompanyDetailViewProps = {
  company: CompanyDetail;
  isRefreshing: boolean;
  isDeletingCompany: boolean;
  onDeleteCompany: () => void;
  onDeleteInteraction: (interactionSlug: string) => void;
  isDeletingInteraction: (interactionSlug: string) => boolean;
  onResearchSaved?: (research: CompanyResearchResult, newSlug?: string) => void;
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
  const [selectedInteractionSlug, setSelectedInteractionSlug] = useState<string | null>(null);

  // Flatten all interactions from opportunities for status processing
  // Restore parent opportunity reference since backend strips it from nested interactions
  const allInteractions = useMemo(
    () =>
      company.opportunities.flatMap((opp) =>
        opp.interactions.map((int) => ({
          ...int,
          jobOpportunity: {
            slug: opp.slug,
            roleTitle: opp.roleTitle,
            pipelineType: opp.pipelineType,
            status: opp.status,
            priority: opp.priority,
            updatedAt: opp.updatedAt,
            company: opp.company,
          } as any, // Minimal metadata, not full Opportunity
        }))
      ),
    [company.opportunities]
  );

  const displayInteractions = useMemo(() => promoteOverdueInteractionsForRead(allInteractions), [allInteractions]);

  const opportunitiesWithInteractions = useMemo(() => {
    // Create a map for fast lookup: interaction slug -> which opportunity it belongs to
    const interactionToOppMap = new Map<string, string>();
    company.opportunities.forEach((opp) => {
      opp.interactions.forEach((int) => {
        interactionToOppMap.set(int.slug, opp.slug);
      });
    });

    return [...company.opportunities]
      .map((opportunity) => ({
        ...opportunity,
        interactions: displayInteractions.filter(
          (interaction) => interactionToOppMap.get(interaction.slug) === opportunity.slug
        ),
      }))
      .sort((left, right) => {
        const leftLast = left.interactions.at(-1)?.date ?? left.updatedAt;
        const rightLast = right.interactions.at(-1)?.date ?? right.updatedAt;

        return new Date(rightLast).getTime() - new Date(leftLast).getTime();
      });
  }, [company.opportunities, displayInteractions]);

  const selectedInteraction = useMemo(
    () => displayInteractions.find((item) => item.slug === selectedInteractionSlug) ?? null,
    [displayInteractions, selectedInteractionSlug]
  );
  const selectedOpportunity = useMemo(
    () =>
      selectedInteraction
        ? buildSelectedOpportunityForInteraction(selectedInteraction, displayInteractions, company.opportunities)
        : null,
    [company.opportunities, displayInteractions, selectedInteraction]
  );

  useEffect(() => {
    if (selectedInteractionSlug && !displayInteractions.some((item) => item.slug === selectedInteractionSlug)) {
      setSelectedInteractionSlug(null);
    }
  }, [displayInteractions, selectedInteractionSlug]);

  const primary = company.opportunities[0];
  const domains = [
    ...new Set(company.opportunities.flatMap((item) => item.domains.map((domain) => domain.domain.label))),
  ];
  const summaryDomain = domains.find((domain) => !domain.includes(".")) ?? domains[0] ?? "-";
  const summaryFacts = [
    { label: "Location", value: company.location ?? "-", icon: "location_on" },
    {
      label: "Size",
      value: company.employeesRange?.label ?? "-",
      icon: "groups",
    },
    {
      label: "Total Raised",
      value: company.totalRaised ?? "-",
      icon: "payments",
    },
    {
      label: "Latest Round",
      value: company.latestRound ?? "-",
      icon: "trending_up",
    },
    { label: "Funding", value: company.funding ?? "-", icon: "account_balance" },
  ] as const;

  const researchExistingData = {
    companySearchName: company.searchName ?? null,
    linkedinUrl: company.linkedinUrl ?? null,
    funding: company.funding ?? null,
    customersTraction: company.customersTraction ?? null,
    companyDescription: company.description ?? null,
    productDescription: company.productDescription ?? null,
    location: company.location ?? null,
    employees: company.employeesRange?.label ?? null,
  };

  const researchContext = `Roles: ${company.opportunities.length} · Interactions: ${allInteractions.length} · Domains: ${domains.join(", ") || "None"}`;

  const companyBadge = useMemo(() => {
    return getOpportunityProcessBadgeMeta(primary, displayInteractions);
  }, [primary, displayInteractions]);

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate font-title-lg text-title-lg font-bold text-on-background">{company.name}</h1>
            {companyBadge ? <Badge tone={companyBadge.tone}>{companyBadge.label}</Badge> : null}
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {company.opportunities.length} role
            {company.opportunities.length === 1 ? "" : "s"} · {allInteractions.length} interaction
            {allInteractions.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {isRefreshing ? <InlineLoadingState label="Refreshing" /> : null}
          <Button
            className="btn btn-secondary text-error hover:bg-error-container"
            loading={isDeletingCompany}
            loadingLabel="Deleting..."
            leadingIcon="delete"
            onClick={() => {
              if (window.confirm(`Delete ${company.name} and all its opportunities/interactions?`)) {
                onDeleteCompany();
              }
            }}
          >
            Delete Company
          </Button>
          <Link className="btn btn-secondary" to="/companies">
            <MaterialIcon name="arrow_back" />
            Companies
          </Link>
        </div>
      </div>

      <div className="mt-6">
        <CompanyFactsStrip
          facts={summaryFacts
            .filter((fact) => fact.value !== "-")
            .map((fact) => ({
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
            companySlugOrId={company.slug}
            companyName={company.name}
            knownContext={researchContext}
            existingCompanyData={researchExistingData}
            onSaved={(research, newSlug) => {
              void queryClient.invalidateQueries({
                queryKey: ["company", company.name],
              });
              void queryClient.invalidateQueries({ queryKey: ["companies"] });
              void queryClient.invalidateQueries({
                queryKey: ["opportunities"],
              });
              setShowResearch(false);
              onResearchSaved?.(research, newSlug);
            }}
          />
        </section>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-8">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-title-md text-title-md font-bold">Opportunity Timelines</h2>
              <p className="mt-1 text-body-md text-on-surface-variant">
                All roles and their interactions in one place.
              </p>
            </div>
            <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
              {opportunitiesWithInteractions.length}{" "}
              {opportunitiesWithInteractions.length === 1 ? "opportunity" : "opportunities"}
            </div>
          </div>

          <div className="space-y-4">
            {opportunitiesWithInteractions.map((item) => (
              <OpportunityInteractionTimeline
                key={item.slug}
                companyName={company.name}
                roleTitle={item.roleTitle}
                interactions={item.interactions}
                opportunity={item}
                selectedInteractionSlug={selectedInteractionSlug}
                onSelectInteraction={setSelectedInteractionSlug}
                onDeleteInteraction={onDeleteInteraction}
                isDeletingInteraction={isDeletingInteraction}
                opportunityHref={`/opportunities/${item.slug}`}
                defaultCollapsed={item.slug !== opportunitiesWithInteractions[0]?.slug}
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
              {
                label: "English Search Name",
                value: company.searchName ?? "-",
              },
              { label: "Work Model", value: primary?.workModel?.label ?? "-" },
              {
                label: "LinkedIn",
                value: company.linkedinUrl ?? "-",
                href: company.linkedinUrl,
              },
              { label: "Company", value: company.description ?? "-" },
            ]}
            moreRows={[
              { label: "Domains", value: domains.join(", ") || "-" },
              { label: "Location", value: company.location ?? "-" },
              { label: "Size", value: company.employeesRange?.label ?? "-" },
              { label: "Stage", value: company.companyStage?.label ?? "-" },
              { label: "Total Raised", value: company.totalRaised ?? "-" },
              { label: "Latest Round", value: company.latestRound ?? "-" },
              { label: "Funding / Rounds", value: company.funding ?? "-" },
              {
                label: "Customers / Traction",
                value: company.customersTraction ?? "-",
              },
            ]}
          />

          <CompanySummaryCard
            title="Technical / Role Context"
            defaultRows={2}
            rows={[
              { label: "Tech Stack", value: company.techStack ?? "-" },
              {
                label: "Backend / Frontend Split",
                value: company.backendFrontendSplit ?? "-",
              },
            ]}
            moreRows={[
              {
                label: "Compensation Notes",
                value: primary?.compensationNotes ?? "-",
              },
              { label: "Research Notes", value: primary?.notes ?? "-" },
            ]}
          />
        </div>
      </div>

      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={selectedOpportunity}
        onClose={() => setSelectedInteractionSlug(null)}
        onSelectInteraction={setSelectedInteractionSlug}
      />
    </>
  );
}
