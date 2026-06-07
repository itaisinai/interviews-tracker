import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import { formatDate, initials } from "../lib/format";

export function CompaniesPage() {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["companies"], queryFn: api.companies });
  const deleteCompany = useMutation({ mutationFn: (companyName: string) => api.deleteCompany(companyName), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["companies"] }); void queryClient.invalidateQueries({ queryKey: ["opportunities"] }); } });
  const rows = data.filter((item) => item.companyName.toLowerCase().includes(search.toLowerCase()));

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
        <table className="w-full text-left text-body-md">
          <thead className="border-b border-outline-variant bg-surface-container-lowest font-label-md text-label-md uppercase text-on-surface-variant">
            <tr>
              <th className="px-6 py-4">Company</th>
              <th className="px-6 py-4">Domains</th>
              <th className="px-6 py-4">Stage</th>
              <th className="px-6 py-4">Size</th>
              <th className="px-6 py-4">Work Model</th>
              <th className="px-6 py-4">Roles</th>
              <th className="px-6 py-4">Interactions</th>
              <th className="px-6 py-4">Next Interaction</th>
              <th className="px-6 py-4">Priority</th>
              <th className="px-6 py-4">Delete</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((item) => (
              <tr key={item.companyName} className="hover:bg-surface-container-low">
                <td className="px-6 py-4">
                  <Link className="flex items-center gap-3 font-semibold text-on-background" to={`/companies/${encodeURIComponent(item.companyName)}`}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-on-primary-container font-geist font-bold text-white">{initials(item.companyName)}</span>
                    {item.companyName}
                  </Link>
                </td>
                <td className="px-6 py-4 text-on-surface-variant">{item.domains.join(", ") || "-"}</td>
                <td className="px-6 py-4 text-on-surface-variant">{item.stage ?? "-"}</td>
                <td className="px-6 py-4 text-on-surface-variant">{item.employees ?? "-"}</td>
                <td className="px-6 py-4 text-on-surface-variant">{item.workModel ?? "-"}</td>
                <td className="px-6 py-4 font-geist">{item.rolesCount}</td>
                <td className="px-6 py-4 font-geist">{item.interactionsCount}</td>
                <td className="px-6 py-4 text-on-surface-variant">{item.nextInteraction ? `${formatDate(item.nextInteraction.date)} ${item.nextInteraction.type}` : "-"}</td>
                <td className="px-6 py-4"><Badge value={item.priority} /></td>
                <td className="px-6 py-4">
                  <LoadingButton
                    compact
                    aria-label={`Delete ${item.companyName}`}
                    className="text-error"
                    icon="delete"
                    loading={deleteCompany.isPending && deleteCompany.variables === item.companyName}
                    onClick={() => { if (window.confirm(`Delete ${item.companyName} and all its opportunities/interactions?`)) deleteCompany.mutate(item.companyName); }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
