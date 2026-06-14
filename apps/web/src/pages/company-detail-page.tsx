import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/badge";
import { CompanyResearchPanel } from "../components/company-research-panel";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import { formatDateTime, titleize } from "../lib/format";

export function CompanyDetailPage() {
  const { companyName = "" } = useParams();
  const decodedName = decodeURIComponent(companyName);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["company", decodedName], queryFn: () => api.company(decodedName), enabled: Boolean(decodedName) });
  const deleteCompany = useMutation({ mutationFn: () => api.deleteCompany(decodedName), onSuccess: () => navigate("/companies") });
  const deleteOpportunity = useMutation({ mutationFn: (id: string) => api.deleteOpportunity(id), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["company", decodedName] }); void queryClient.invalidateQueries({ queryKey: ["companies"] }); } });
  const deleteInteraction = useMutation({ mutationFn: (id: string) => api.deleteInteraction(id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["company", decodedName] }) });

  if (isLoading || !data) {
    return <PageLoadingState title="Company" description="Loading company details, opportunities, and interactions." />;
  }

  if (isError) {
    return <PageErrorState title="Company" description={error instanceof Error ? error.message : "Unable to load company details."} onRetry={() => void refetch()} />;
  }

  const primary = data.opportunities[0];
  const domains = [...new Set(data.opportunities.flatMap((item) => item.domains.map((domain) => domain.domain.label)))];
  const linkedInUrl = data.opportunities.find((item) => Boolean(item.linkedinUrl?.trim()))?.linkedinUrl ?? primary?.linkedinUrl ?? null;
  const researchExistingData = {
    companySearchName: data.opportunities.find((item) => Boolean(item.companySearchName?.trim()))?.companySearchName ?? null,
    linkedinUrl: linkedInUrl,
    funding: data.opportunities.find((item) => Boolean(item.funding?.trim()))?.funding ?? null,
    customersTraction: data.opportunities.find((item) => Boolean(item.customersTraction?.trim()))?.customersTraction ?? null,
    companyDescription: data.opportunities.find((item) => Boolean(item.companyDescription?.trim()))?.companyDescription ?? null,
    productDescription: data.opportunities.find((item) => Boolean(item.productDescription?.trim()))?.productDescription ?? null,
    location: data.opportunities.find((item) => Boolean(item.location?.trim()))?.location ?? null,
    employees: data.opportunities.find((item) => Boolean(item.employeesRange?.label?.trim()))?.employeesRange?.label ?? null
  };

  return (
    <>
      <PageIntro
        title={data.companyName}
        description={`${data.opportunities.length} role${data.opportunities.length === 1 ? "" : "s"} · ${data.interactions.length} interaction${data.interactions.length === 1 ? "" : "s"}`}
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <LoadingButton className="btn btn-secondary text-error hover:bg-error-container" loading={deleteCompany.isPending} loadingLabel="Deleting..." icon="delete" onClick={() => { if (window.confirm(`Delete ${data.companyName} and all its opportunities/interactions?`)) deleteCompany.mutate(); }}>
              Delete Company
            </LoadingButton>
            <Link className="btn btn-secondary" to="/companies"><MaterialIcon name="arrow_back" />Companies</Link>
          </>
        }
      />

      <CompanyResearchPanel
        companyName={data.companyName}
        knownContext={`Roles: ${data.opportunities.length} · Interactions: ${data.interactions.length} · Domains: ${domains.join(", ") || "None"}`}
        existingCompanyData={researchExistingData}
        onSaved={(research) => {
          if (research.companyName !== data.companyName) {
            navigate(`/companies/${encodeURIComponent(research.companyName)}`, { replace: true });
          }
        }}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">Company Profile</h3>
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

        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">Technical / Role Context</h3>
          <Detail label="Tech Stack" value={primary?.techStack} />
          <Detail label="Backend / Frontend Split" value={primary?.backendFrontendSplit} />
          <Detail label="Compensation Notes" value={primary?.compensationNotes} />
          <Detail label="Research Notes" value={primary?.notes} />
        </section>

        <section className="panel p-6 lg:col-span-4">
          <h3 className="mb-4 font-title-md text-title-md font-bold">Opportunities</h3>
          <div className="space-y-3">
            {data.opportunities.map((item) => (
              <Link key={item.id} className="block rounded-lg bg-surface-container-low p-4 hover:bg-surface-container" to={`/opportunities/${item.id}`}>
                <div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.roleTitle}</p><div className="flex items-center gap-2"><Badge value={item.status} /><LoadingButton compact aria-label={`Delete ${item.roleTitle}`} className="text-error" icon="delete" loading={deleteOpportunity.isPending && deleteOpportunity.variables === item.id} onClick={(event: MouseEvent<HTMLButtonElement>) => { event.preventDefault(); if (window.confirm(`Delete ${item.roleTitle}?`)) deleteOpportunity.mutate(item.id); }} /></div></div>
                <p className="mt-1 text-body-md text-on-surface-variant">{titleize(item.pipelineType)} · {item.nextStep ?? "No next step"}</p>
                {item.jobUrl ? (
                  <button className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-label-sm text-label-sm text-primary hover:bg-primary/15" onClick={(event) => { event.preventDefault(); window.open(item.jobUrl ?? "", "_blank", "noopener,noreferrer"); }}>
                    <MaterialIcon name="open_in_new" className="text-[16px]" />
                    Job link
                  </button>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="relative mt-8 timeline-track">
        <div className="relative z-10 mb-6 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary"><MaterialIcon name="event" filled /></div>
          <h3 className="font-title-md text-title-md font-bold">Company Interactions</h3>
        </div>
        <div className="ml-10 space-y-4">
          {data.interactions.map((item) => (
            <article key={item.id} className="rounded-xl border border-outline-variant bg-white p-5 shadow-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">{formatDateTime(item.date)}</span>
                <MaterialIcon name={item.type.toLowerCase().includes("email") ? "mail" : "call"} className="text-primary" />
                <span className="font-semibold">{item.type}</span>
                <Badge value={item.status} />
              </div>
              <p className="text-body-md text-on-surface-variant">{item.jobOpportunity?.roleTitle} · {item.stage ?? "No stage"} · {item.personName ?? "No person"}</p>
              {item.agenda ? <p className="mt-3 text-body-md">{item.agenda}</p> : null}
              {item.followUp ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md italic">"{item.followUp}"</p> : null}
              <LoadingButton compact aria-label="Delete interaction" className="mt-3 font-label-md text-label-md text-error" icon="delete" loading={deleteInteraction.isPending && deleteInteraction.variables === item.id} onClick={() => { if (window.confirm("Delete this interaction?")) deleteInteraction.mutate(item.id); }}>
                Delete interaction
              </LoadingButton>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      {isUrl && value ? (
        <a className="mt-1 inline-flex items-center gap-2 break-all text-body-md text-primary hover:underline" href={value} target="_blank" rel="noreferrer">
          <MaterialIcon name="open_in_new" className="text-[16px]" />
          <span>{value}</span>
        </a>
      ) : (
        <p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">{value || "-"}</p>
      )}
    </div>
  );
}
