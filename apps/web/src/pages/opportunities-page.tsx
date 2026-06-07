import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import type { Opportunity } from "../lib/types";
import { formatDate, initials, titleize } from "../lib/format";

function mobileOpportunityState(item: Opportunity) {
  if (item.pipelineType === "ACTIVE_PROCESS") return { label: "ACTIVE", tone: "active" as const, border: "border-primary" };
  if (item.status === "OFFER") return { label: "OFFER", tone: "violet" as const, border: "border-tertiary-container" };
  if (item.status === "REJECTED") return { label: "CLOSED", tone: "muted" as const, border: "border-outline-variant" };
  if (item.status === "APPLIED") return { label: "APPLIED", tone: "blue" as const, border: "border-outline-variant" };
  if (item.status.includes("PHONE") || item.status.includes("TECHNICAL") || item.status === "FINAL_STAGE") {
    return { label: "INTERVIEWING", tone: "active" as const, border: "border-primary" };
  }
  return { label: titleize(item.status), tone: "blue" as const, border: "border-outline-variant" };
}

function mobileOpportunityMeta(item: Opportunity) {
  if (item.nextStep?.trim()) return item.nextStep;
  if (item.referrerOrConnection?.trim()) return item.referrerOrConnection;
  return formatDate(item.updatedAt);
}

export function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [priority, setPriority] = useState("");
  const [domainId, setDomainId] = useState("");
  const [sort, setSort] = useState("updated");
  const queryClient = useQueryClient();
  const { data: options, isLoading: optionsLoading, isError: optionsError, error: optionsErrorValue, refetch: refetchOptions, isFetching: optionsFetching } = useQuery({ queryKey: ["options"], queryFn: api.options, staleTime: Infinity });
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (pipeline) params.set("pipeline", pipeline);
    if (priority) params.set("priority", priority);
    if (domainId) params.set("domainId", domainId);
    if (sort) params.set("sort", sort);
    const value = params.toString();
    return value ? `?${value}` : "";
  }, [domainId, pipeline, priority, search, sort, status]);
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["opportunities", query], queryFn: () => api.opportunities(query), staleTime: 30_000 });
  const deleteOpportunity = useMutation({
    mutationFn: (id: string) => api.deleteOpportunity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });

  if (optionsLoading || isLoading) {
    return <PageLoadingState title="Opportunities" description="Loading your pipeline and filter options." />;
  }

  if (optionsError) {
    return <PageErrorState title="Opportunities" description={optionsErrorValue instanceof Error ? optionsErrorValue.message : "Unable to load filter options."} onRetry={() => void refetchOptions()} />;
  }

  if (isError) {
    return <PageErrorState title="Opportunities" description={error instanceof Error ? error.message : "Unable to load opportunities."} onRetry={() => void refetch()} />;
  }

  return (
    <>
      <div className="md:hidden">
        <section className="mb-5 space-y-4">
          <div className="relative">
            <MaterialIcon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-3 pl-10 pr-4 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Search opportunities..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="flex overflow-x-auto gap-3 pb-1 hide-scrollbar">
            <button className={`whitespace-nowrap rounded-full px-4 py-2 font-label-md ${!status && !pipeline && !priority && !domainId ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`} onClick={() => { setStatus(""); setPipeline(""); setPriority(""); setDomainId(""); }}>
              All
            </button>
            <select className="rounded-full bg-surface-container-high px-4 py-2 font-label-md text-on-surface-variant" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">Status</option>
              {statuses.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}
            </select>
            <select className="rounded-full bg-surface-container-high px-4 py-2 font-label-md text-on-surface-variant" value={pipeline} onChange={(event) => setPipeline(event.target.value)}>
              <option value="">Pipeline</option>
              <option value="ACTIVE_PROCESS">Active Process</option>
              <option value="POTENTIAL">Potential</option>
              <option value="ARCHIVED">Archived</option>
            </select>
            <select className="rounded-full bg-surface-container-high px-4 py-2 font-label-md text-on-surface-variant" value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">Priority</option>
              <option>HIGH</option>
              <option>MEDIUM</option>
              <option>LOW</option>
              <option>MAYBE</option>
            </select>
          </div>
        </section>

        <section className="space-y-4 pb-8">
          {data.map((item) => {
            const state = mobileOpportunityState(item);
            return (
              <Link key={item.id} to={`/opportunities/${item.id}`} className={`block rounded-xl border bg-surface-container-lowest p-4 shadow-sm ${state.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-title-md text-title-md font-bold text-on-background">{item.companyName}</h3>
                    <p className="truncate font-body-md text-body-md text-on-surface-variant">{item.roleTitle}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 font-label-md text-label-md ${state.tone === "active" ? "bg-primary/10 text-primary" : state.tone === "violet" ? "bg-tertiary-fixed text-on-tertiary-fixed-variant" : state.tone === "muted" ? "bg-surface-container-high text-on-surface-variant" : "bg-secondary/10 text-secondary"}`}>
                    {state.label}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/20 pt-4">
                  <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                    <MaterialIcon name={item.referrerOrConnection ? "account_tree" : "mail"} className="text-[18px]" />
                    <span className="truncate">{item.referrerOrConnection ?? "Recent activity"}</span>
                  </div>
                  <Badge value={item.priority} />
                  <div className="ml-auto font-label-md text-label-md font-semibold text-primary">{mobileOpportunityMeta(item)}</div>
                </div>
              </Link>
            );
          })}
          {data.length === 0 ? <p className="text-body-md text-on-surface-variant">No opportunities found.</p> : null}
        </section>

        <Link to="/opportunities/new" className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg">
          <MaterialIcon name="add" filled className="text-[28px]" />
        </Link>
      </div>

      <div className="hidden md:block">
        <PageIntro
          title="Opportunities"
          description="Manage your active pipeline and potential leads."
          actions={
            <Link className="btn btn-primary" to="/opportunities/new">
              <MaterialIcon name="add" />
              Add Opportunity
            </Link>
          }
        />

        <div className="panel mb-6 flex flex-wrap items-center gap-4 p-4">
          <input className="input max-w-xs border-none bg-surface-container-low" placeholder="Search company or role" value={search} onChange={(event) => setSearch(event.target.value)} />
          <span className="font-label-md text-label-md text-on-surface-variant">Filters:</span>
          <select className="rounded-lg border-none bg-surface-container-low px-4 py-2 text-body-md focus:ring-1 focus:ring-primary" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Status: All</option>
            {statuses.map((item) => <option key={item} value={item}>{titleize(item)}</option>)}
          </select>
          <select className="rounded-lg border-none bg-surface-container-low px-4 py-2 text-body-md focus:ring-1 focus:ring-primary" value={pipeline} onChange={(event) => setPipeline(event.target.value)}>
            <option value="">Pipeline: All</option>
            <option value="ACTIVE_PROCESS">Active Process</option>
            <option value="POTENTIAL">Potential</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <select className="rounded-lg border-none bg-surface-container-low px-4 py-2 text-body-md focus:ring-1 focus:ring-primary" value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">Priority: All</option>
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
            <option>MAYBE</option>
          </select>
          <select className="rounded-lg border-none bg-surface-container-low px-4 py-2 text-body-md focus:ring-1 focus:ring-primary" value={domainId} onChange={(event) => setDomainId(event.target.value)}>
            <option value="">Domain: All</option>
            {options?.domains.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant">Sort by:</span>
            <select className="rounded-lg border-none bg-surface-container-low px-4 py-2 text-body-md focus:ring-1 focus:ring-primary" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="updated">Recently Updated</option>
              <option value="nextInteraction">Next Interaction</option>
            </select>
            {isFetching || optionsFetching ? <InlineLoadingState label="Refreshing" /> : null}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-lowest">
                  {["Company", "Role", "Status", "Priority", "Pipeline", "Referrer / Connection", "Next Interaction", "Next Step", "Updated", "Delete"].map((heading) => (
                    <th key={heading} className="px-6 py-4 text-left font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {data.map((item) => {
                  const next = item.interactions?.filter((interaction) => new Date(interaction.date) >= new Date()).sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
                  const active = item.pipelineType === "ACTIVE_PROCESS";
                  return (
                    <tr key={item.id} className={`group transition-colors hover:bg-surface-container-low ${active ? "bg-primary/[0.02] hover:bg-primary/5" : ""}`}>
                      <td className="px-6 py-4">
                        <Link to={`/opportunities/${item.id}`} className="flex items-center">
                          <div className={`mr-2 flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white ${active ? "bg-on-primary-container" : "bg-surface-container-high text-on-background"}`}>{initials(item.companyName)}</div>
                          <span className="font-medium text-on-background">{item.companyName}</span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex min-w-52 flex-col gap-1">
                          <span className="font-medium text-on-surface-variant">{item.roleTitle}</span>
                          {item.jobUrl ? (
                            <a className="inline-flex w-fit items-center gap-1 rounded-full bg-primary/10 px-2 py-1 font-label-sm text-label-sm text-primary hover:bg-primary/15" href={item.jobUrl} target="_blank" rel="noreferrer">
                              <MaterialIcon name="open_in_new" className="text-[16px]" />
                              Job link
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-6 py-4"><Badge value={item.status} /></td>
                      <td className="px-6 py-4"><Badge value={item.priority} /></td>
                      <td className="px-6 py-4"><Badge value={item.pipelineType}>{item.pipelineType === "POTENTIAL" ? "Potential / Research" : titleize(item.pipelineType)}</Badge></td>
                      <td className="px-6 py-4 text-body-md text-on-surface-variant">{item.referrerOrConnection ?? "-"}</td>
                      <td className="px-6 py-4 font-medium text-on-surface-variant">{next ? `${formatDate(next.date)} ${next.type}` : "-"}</td>
                      <td className="px-6 py-4 text-body-md font-medium text-primary">{item.nextStep ?? "-"}</td>
                      <td className="px-6 py-4 text-body-md italic text-on-surface-variant">{formatDate(item.updatedAt)}</td>
                      <td className="px-6 py-4"><LoadingButton compact aria-label={`Delete ${item.companyName} / ${item.roleTitle}`} className="text-error" icon="delete" loading={deleteOpportunity.isPending && deleteOpportunity.variables === item.id} onClick={() => { if (window.confirm(`Delete ${item.companyName} / ${item.roleTitle}?`)) deleteOpportunity.mutate(item.id); }} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

const statuses = ["RESEARCH_LEAD", "TO_APPLY", "APPLIED", "RECRUITER_REACHED_OUT", "PHONE_SCHEDULED", "PHONE_DONE", "TECHNICAL_SCHEDULED", "TECHNICAL_DONE", "HOME_ASSIGNMENT", "ASSIGNMENT_SUBMITTED", "FINAL_STAGE", "OFFER", "REJECTED", "PAUSED", "NOT_RELEVANT"];
