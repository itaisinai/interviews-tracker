import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "../components/badge";
import { DataTable } from "../components/data-table";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import { jobStatusOptions, pipelineTypeOptions, priorityOptions } from "../lib/enum-labels";
import type { Opportunity } from "../lib/types";
import { formatDate, titleize } from "../lib/format";

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
  const navigate = useNavigate();
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
  const columns = useMemo<ColumnDef<Opportunity>[]>(() => [
    {
      header: "Company",
      size: 220,
      cell: ({ row }) => {
        return <span className="block truncate font-medium text-on-background">{row.original.companyName}</span>;
      }
    },
    {
      header: "Role",
      size: 240,
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="block truncate font-medium text-on-surface-variant">{row.original.roleTitle}</span>
        </div>
      )
    },
    { header: "Status", size: 190, cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "Priority", size: 140, cell: ({ row }) => <Badge value={row.original.priority} /> },
    { header: "Pipeline", size: 200, cell: ({ row }) => <Badge value={row.original.pipelineType} /> },
    { header: "Referrer / Connection", size: 220, cell: ({ row }) => <span className="block truncate text-body-md text-on-surface-variant">{row.original.referrerOrConnection ?? "-"}</span> },
    {
      header: "Next Interaction",
      size: 190,
      cell: ({ row }) => {
        const next = row.original.interactions?.filter((interaction) => new Date(interaction.date) >= new Date()).sort((a, b) => +new Date(a.date) - +new Date(b.date))[0];
        return <span className="block truncate font-medium text-on-surface-variant">{next ? `${formatDate(next.date)} ${next.type}` : "-"}</span>;
      }
    },
    { header: "Next Step", size: 220, cell: ({ row }) => <span className="block truncate text-body-md font-medium text-primary">{row.original.nextStep ?? "-"}</span> },
    { header: "Updated", size: 140, cell: ({ row }) => <span className="block truncate text-body-md italic text-on-surface-variant">{formatDate(row.original.updatedAt)}</span> },
    {
      header: "Job Link",
      size: 140,
      cell: ({ row }) =>
        row.original.jobUrl ? (
          <a
            className="inline-flex w-fit items-center gap-1 rounded-full bg-surface-container-high px-2.5 py-1 font-label-sm text-[11px] font-medium text-primary transition-colors hover:bg-surface-container-high/80"
            href={row.original.jobUrl}
            target="_blank"
            rel="noreferrer"
            title={`Open job link for ${row.original.companyName}`}
          >
            <MaterialIcon name="open_in_new" className="text-[15px]" />
            Job link
          </a>
        ) : (
          <span className="text-body-md text-on-surface-variant">-</span>
        )
    },
    {
      header: "Delete",
      size: 110,
      cell: ({ row }) => (
        <LoadingButton
          compact
          aria-label={`Delete ${row.original.companyName} / ${row.original.roleTitle}`}
          className="text-error"
          icon="delete"
          loading={deleteOpportunity.isPending && deleteOpportunity.variables === row.original.id}
          onClick={() => {
            if (window.confirm(`Delete ${row.original.companyName} / ${row.original.roleTitle}?`)) deleteOpportunity.mutate(row.original.id);
          }}
        />
      )
    }
  ], [deleteOpportunity]);

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
          <div className="flex flex-wrap gap-3 pb-1 hide-scrollbar">
            <button className={`whitespace-nowrap rounded-full px-4 py-2 font-label-md ${!status && !pipeline && !priority && !domainId ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`} onClick={() => { setStatus(""); setPipeline(""); setPriority(""); setDomainId(""); }}>
              All
            </button>
            <FilterChip label="Status" value={status} onChange={setStatus} options={jobStatusOptions} />
            <FilterChip label="Pipeline" value={pipeline} onChange={setPipeline} options={pipelineTypeOptions} />
            <FilterChip label="Priority" value={priority} onChange={setPriority} options={priorityOptions} />
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

      <div className="hidden md:flex h-[calc(100dvh-8rem)] min-h-0 flex-col overflow-hidden">
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

        <div className="panel mb-6 grid items-center gap-4 overflow-hidden px-5 py-5 xl:grid-cols-[minmax(240px,1.1fr)_auto_repeat(4,minmax(0,1fr))_minmax(140px,auto)]">
          <input className="input min-w-0 border border-[#d4dbe3] bg-surface-container-lowest/90" placeholder="Search company or role" value={search} onChange={(event) => setSearch(event.target.value)} />
          <span className="font-label-md text-label-md text-on-surface-variant">Filters:</span>
          <FilterChip label="Status" value={status} onChange={setStatus} options={jobStatusOptions} />
          <FilterChip label="Pipeline" value={pipeline} onChange={setPipeline} options={pipelineTypeOptions} />
          <FilterChip label="Priority" value={priority} onChange={setPriority} options={priorityOptions} />
          <FilterChip label="Domain" value={domainId} onChange={setDomainId} options={(options?.domains ?? []).map((item) => ({ value: item.id, label: item.label }))} />
          <div className="ml-auto flex items-center gap-3">
            <span className="font-label-md text-label-md text-on-surface-variant">Sort by:</span>
            <select className="rounded-full border border-[#d4dbe3] bg-[#e8f0f8] px-4 py-2.5 pr-12 text-body-md text-[#20303d] outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-primary/10" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="updated">Recently Updated</option>
              <option value="nextInteraction">Next Interaction</option>
            </select>
            {isFetching || optionsFetching ? <InlineLoadingState label="Refreshing" /> : null}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
          <div className="h-full overflow-auto custom-scrollbar">
            <DataTable
              data={data}
              columns={columns}
              className="min-w-[1500px]"
              tableClassName="table-fixed w-full border-collapse text-left text-body-md"
              emptyState={<span>No opportunities found.</span>}
              getRowProps={(row) => ({
                role: "link",
                tabIndex: 0,
                title: `Open ${row.companyName} / ${row.roleTitle}`,
                className: `cursor-pointer transition-colors hover:bg-surface-container-low ${row.pipelineType === "ACTIVE_PROCESS" ? "bg-primary/[0.02] hover:bg-primary/5" : ""}`,
                onClick: (event) => {
                  const target = event.target as HTMLElement;
                  if (target.closest("a,button,input,select,textarea")) return;
                  navigate(`/opportunities/${row.id}`);
                },
                onKeyDown: (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/opportunities/${row.id}`);
                  }
                }
              })}
            />
          </div>
        </div>
      </div>
    </>
  );
}

function FilterChip({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="relative min-w-[150px] flex-1 md:min-w-0">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        title={`${label}: ${value || "All"}`}
        className="appearance-none w-full rounded-full border border-[#d4dbe3] bg-[#e8f0f8] px-5 py-2 pr-12 text-[14px] text-[#20303d] shadow-sm outline-none transition-colors focus:border-primary/30 focus:ring-2 focus:ring-primary/10"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{label}: All</option>
        {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
      <MaterialIcon name="keyboard_arrow_down" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    </div>
  );
}
