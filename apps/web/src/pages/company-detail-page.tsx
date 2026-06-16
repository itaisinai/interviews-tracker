import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import { PageIntro } from "../components/app-shell";
import { CompanyResearchPanel } from "../components/company-research-panel";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { OpportunityInteractionTimeline } from "../components/interactions-timeline";
import {
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";
import { api } from "../lib/api";
import { buildSelectedOpportunityForInteraction } from "./interactions-page-selection";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";

export function CompanyDetailPage() {
  const { companyName = "" } = useParams();
  const decodedName = decodeURIComponent(companyName);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["company", decodedName],
    queryFn: () => api.company(decodedName),
    enabled: Boolean(decodedName),
  });

  const deleteCompany = useMutation({
    mutationFn: () => api.deleteCompany(decodedName),
    onSuccess: () => navigate("/companies"),
  });

  const deleteInteraction = useMutation({
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", decodedName] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSelectedInteractionId(null);
    },
  });

  const displayInteractions = useMemo(
    () => promoteOverdueInteractionsForRead(data?.interactions ?? []),
    [data?.interactions],
  );
  const opportunities = data?.opportunities ?? [];
  const opportunitiesWithInteractions = useMemo(() => {
    return [...opportunities]
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
  }, [displayInteractions, opportunities]);

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
            opportunities,
          )
        : null,
    [displayInteractions, opportunities, selectedInteraction],
  );

  useEffect(() => {
    if (
      selectedInteractionId &&
      !displayInteractions.some((item) => item.id === selectedInteractionId)
    ) {
      setSelectedInteractionId(null);
    }
  }, [displayInteractions, selectedInteractionId]);

  if (isLoading || !data) {
    return (
      <PageLoadingState
        title="Company"
        description="Loading company details, opportunities, and interactions."
      />
    );
  }

  if (isError) {
    return (
      <PageErrorState
        title="Company"
        description={
          error instanceof Error
            ? error.message
            : "Unable to load company details."
        }
        onRetry={() => void refetch()}
      />
    );
  }

  const primary = opportunities[0];
  const domains = [
    ...new Set(
      opportunities.flatMap((item) =>
        item.domains.map((domain) => domain.domain.label),
      ),
    ),
  ];
  const linkedInUrl =
    opportunities.find((item) => Boolean(item.linkedinUrl?.trim()))
      ?.linkedinUrl ?? primary?.linkedinUrl ?? null;
  const researchExistingData = {
    companySearchName:
      opportunities.find((item) => Boolean(item.companySearchName?.trim()))
        ?.companySearchName ?? null,
    linkedinUrl: linkedInUrl,
    funding:
      opportunities.find((item) => Boolean(item.funding?.trim()))?.funding ??
      null,
    customersTraction:
      opportunities.find((item) => Boolean(item.customersTraction?.trim()))
        ?.customersTraction ?? null,
    companyDescription:
      opportunities.find((item) => Boolean(item.companyDescription?.trim()))
        ?.companyDescription ?? null,
    productDescription:
      opportunities.find((item) => Boolean(item.productDescription?.trim()))
        ?.productDescription ?? null,
    location:
      opportunities.find((item) => Boolean(item.location?.trim()))?.location ??
      null,
    employees:
      opportunities.find((item) => Boolean(item.employeesRange?.label?.trim()))
        ?.employeesRange?.label ?? null,
  };

  return (
    <>
      <PageIntro
        title={data.companyName}
        description={`${opportunities.length} role${opportunities.length === 1 ? "" : "s"} · ${data.interactions.length} interaction${data.interactions.length === 1 ? "" : "s"}`}
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <LoadingButton
              className="btn btn-secondary text-error hover:bg-error-container"
              loading={deleteCompany.isPending}
              loadingLabel="Deleting..."
              icon="delete"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${data.companyName} and all its opportunities/interactions?`,
                  )
                ) {
                  deleteCompany.mutate();
                }
              }}
            >
              Delete Company
            </LoadingButton>
            <Link className="btn btn-secondary" to="/companies">
              <MaterialIcon name="arrow_back" />
              Companies
            </Link>
          </>
        }
      />

      <CompanyResearchPanel
        companyName={data.companyName}
        knownContext={`Roles: ${opportunities.length} · Interactions: ${data.interactions.length} · Domains: ${domains.join(", ") || "None"}`}
        existingCompanyData={researchExistingData}
        onSaved={(research) => {
          if (research.companyName !== data.companyName) {
            navigate(`/companies/${encodeURIComponent(research.companyName)}`, {
              replace: true,
            });
          }
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-6">
          <h3 className="font-title-md text-title-md font-bold">
            Company Profile
          </h3>
          <Detail label="LinkedIn" value={linkedInUrl} />
          <Detail label="English Search Name" value={primary?.companySearchName} />
          <Detail label="Domains" value={domains.join(", ")} />
          <Detail label="Size" value={primary?.employeesRange?.label} />
          <Detail label="Stage" value={primary?.companyStage?.label} />
          <Detail label="Work Model" value={primary?.workModel?.label} />
          <Detail label="Location" value={primary?.location} />
          <Detail label="Funding / Rounds" value={primary?.funding} />
          <Detail label="Company" value={primary?.companyDescription} />
          <Detail label="Product" value={primary?.productDescription} />
          <Detail label="Customers / Traction" value={primary?.customersTraction} />
        </section>

        <section className="panel p-6 lg:col-span-6">
          <h3 className="font-title-md text-title-md font-bold">
            Technical / Role Context
          </h3>
          <Detail label="Tech Stack" value={primary?.techStack} />
          <Detail label="Backend / Frontend Split" value={primary?.backendFrontendSplit} />
          <Detail label="Compensation Notes" value={primary?.compensationNotes} />
          <Detail label="Research Notes" value={primary?.notes} />
        </section>

      </div>

      <section className="panel mt-6 p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="font-title-md text-title-md font-bold">
              Opportunity Timelines
            </h3>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Each role keeps its own interaction history and opens the same drawer experience as the Interactions page.
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
              onDeleteInteraction={(interactionId) =>
                deleteInteraction.mutate(interactionId)
              }
              isDeletingInteraction={(interactionId) =>
                deleteInteraction.isPending &&
                deleteInteraction.variables === interactionId
              }
              opportunityHref={`/opportunities/${item.slug || item.id}`}
            />
          ))}
        </div>
      </section>

      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={selectedOpportunity}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      {isUrl && value ? (
        <a
          className="mt-1 inline-flex items-center gap-2 break-all text-body-md text-primary hover:underline"
          href={value}
          target="_blank"
          rel="noreferrer"
        >
          <MaterialIcon name="open_in_new" className="text-[16px]" />
          <span>{value}</span>
        </a>
      ) : (
        <p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">
          {value || "-"}
        </p>
      )}
    </div>
  );
}
