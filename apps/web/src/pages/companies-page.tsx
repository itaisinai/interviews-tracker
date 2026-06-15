import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router-dom";
import { Badge } from "../components/badge";
import { DataTable, MaterialIcon } from "@interviews-tracker/design-system";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";
import { api } from "../lib/api";
import { formatDate, initials } from "../lib/format";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  const deleteCompany = useMutation({ mutationFn: (companyName: string) => api.deleteCompany(companyName), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["companies"] }); void queryClient.invalidateQueries({ queryKey: ["opportunities"] }); } });
  const rows = data.filter((item) => item.companyName.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    {
      header: "Company",
      cell: ({ row }) => (
        <Link className="flex items-center gap-3 font-semibold text-on-background" to={`/companies/${encodeURIComponent(row.original.companyName)}`}>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-on-primary-container font-geist font-bold text-white">{initials(row.original.companyName)}</span>
          {row.original.companyName}
        </Link>
      )
    },
    { header: "Domains", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.domains.join(", ") || "-"}</span> },
    { header: "Stage", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.stage ?? "-"}</span> },
    { header: "Size", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.employees ?? "-"}</span> },
    { header: "Work Model", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.workModel ?? "-"}</span> },
    { header: "Roles", cell: ({ row }) => <span className="font-geist">{row.original.rolesCount}</span> },
    { header: "Interactions", cell: ({ row }) => <span className="font-geist">{row.original.interactionsCount}</span> },
    { header: "Next Interaction", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.nextInteraction ? `${formatDate(row.original.nextInteraction.date)} ${row.original.nextInteraction.type}` : "-"}</span> },
    { header: "Priority", cell: ({ row }) => <Badge value={row.original.priority} /> },
    {
      header: "Delete",
      cell: ({ row }) => (
        <LoadingButton
          compact
          aria-label={`Delete ${row.original.companyName}`}
          className="text-error"
          icon="delete"
          loading={deleteCompany.isPending && deleteCompany.variables === row.original.companyName}
          onClick={() => { if (window.confirm(`Delete ${row.original.companyName} and all its opportunities/interactions?`)) deleteCompany.mutate(row.original.companyName); }}
        />
      )
    }
  ] satisfies ColumnDef<(typeof rows)[number]>[];

  if (isLoading) {
    return <PageLoadingState title="Companies" description="Loading your normalized company list." />;
  }

  if (isError) {
    return <PageErrorState title="Companies" description={error instanceof Error ? error.message : "Unable to load companies."} onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageIntro title="Available Companies" description="Every company mentioned in your opportunities and interactions, normalized into one company view." />
      <div className="panel mb-6 flex items-center gap-3 p-4">
        <MaterialIcon name="search" className="text-on-surface-variant" />
        <input className="w-full border-none bg-transparent text-body-md focus:ring-0" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company..." />
        {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
      </div>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <DataTable data={rows} columns={columns} className="min-w-[1200px]" emptyState={<span>No companies found.</span>} />
        </div>
      </div>
    </>
  );
}
