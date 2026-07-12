import { useState } from "react";
import { Link } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";

import { DataTable, MaterialIcon } from "@interviews-tracker/design-system";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../components/app-layout";
import { Badge } from "../components/badge";
import { api } from "../lib/api";
import { formatDate, initials } from "../lib/format";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  const deleteCompany = useMutation({
    mutationFn: (companyName: string) => api.deleteCompany(companyName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
  const rows = data.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()));
  const columns = [
    {
      header: "Company",
      cell: ({ row }) => (
        <Link
          className="flex items-center gap-3 font-semibold text-on-background"
          to={`/companies/${row.original.slug}`}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-on-primary-container font-geist font-bold text-white">
            {initials(row.original.name)}
          </span>
          <span className="truncate" title={row.original.name}>
            {row.original.name}
          </span>
        </Link>
      ),
    },
    {
      header: "Domains",
      cell: ({ row }) => {
        const domainsText = row.original.domains.join(", ") || "-";
        return (
          <span className="block truncate text-on-surface-variant" title={domainsText}>
            {domainsText}
          </span>
        );
      },
    },
    {
      header: "Stage",
      cell: ({ row }) => <span className="text-on-surface-variant">{row.original.stage ?? "-"}</span>,
    },
    {
      header: "Size",
      cell: ({ row }) => <span className="text-on-surface-variant">{row.original.employees ?? "-"}</span>,
    },
    { header: "Roles", cell: ({ row }) => <span className="font-geist">{row.original.rolesCount}</span> },
    { header: "Interactions", cell: ({ row }) => <span className="font-geist">{row.original.interactionsCount}</span> },
    {
      header: "Next Interaction",
      cell: ({ row }) => (
        <span className="text-on-surface-variant">
          {row.original.nextInteraction
            ? `${formatDate(row.original.nextInteraction.date)} ${row.original.nextInteraction.type}`
            : "-"}
        </span>
      ),
    },
    { header: "Priority", cell: ({ row }) => <Badge value={row.original.priority} /> },
    {
      header: "Delete",
      cell: ({ row }) => (
        <LoadingButton
          compact
          aria-label={`Delete ${row.original.name}`}
          className="text-error"
          icon="delete"
          loading={deleteCompany.isPending && deleteCompany.variables === row.original.name}
          onClick={() => {
            if (window.confirm(`Delete ${row.original.name} and all its opportunities/interactions?`))
              deleteCompany.mutate(row.original.name);
          }}
        />
      ),
    },
  ] satisfies ColumnDef<(typeof rows)[number]>[];

  if (isLoading) {
    return <PageLoadingState title="Companies" description="Loading your normalized company list." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Companies"
        description={error instanceof Error ? error.message : "Unable to load companies."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <PageIntro
        title="Available Companies"
        description="Every company mentioned in your opportunities and interactions, normalized into one company view."
      />
      <div className="panel mb-6 flex items-center gap-3 p-4">
        <MaterialIcon name="search" className="text-on-surface-variant" />
        <input
          className="w-full border-none bg-transparent text-body-md focus:ring-0"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company..."
        />
        {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
      </div>

      {/* Mobile: Card view */}
      <div className="md:hidden space-y-3">
        {rows.length === 0 && <div className="panel p-8 text-center text-on-surface-variant">No companies found.</div>}
        {rows.map((company) => (
          <Link
            key={company.name}
            to={`/companies/${company.slug}`}
            className="panel block p-4 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-on-primary-container font-geist font-bold text-white">
                {initials(company.name)}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-on-background truncate">{company.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">
                  <span>
                    {company.rolesCount} {company.rolesCount === 1 ? "role" : "roles"}
                  </span>
                  <span>•</span>
                  <span>
                    {company.interactionsCount} {company.interactionsCount === 1 ? "interaction" : "interactions"}
                  </span>
                </div>
                {company.nextInteraction && (
                  <div className="mt-2 text-sm text-on-surface-variant">
                    Next: {formatDate(company.nextInteraction.date)} {company.nextInteraction.type}
                  </div>
                )}
                <div className="mt-2">
                  <Badge value={company.priority} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <DataTable
            data={rows}
            columns={columns}
            className="min-w-[1200px]"
            emptyState={<span>No companies found.</span>}
          />
        </div>
      </div>
    </>
  );
}
