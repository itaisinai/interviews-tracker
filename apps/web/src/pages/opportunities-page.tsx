import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { api } from "../lib/api";
import { formatDate, initials, titleize } from "../lib/format";

export function OpportunitiesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [pipeline, setPipeline] = useState("");
  const [priority, setPriority] = useState("");
  const [domainId, setDomainId] = useState("");
  const [sort, setSort] = useState("updated");
  const queryClient = useQueryClient();
  const { data: options } = useQuery({ queryKey: ["options"], queryFn: api.options });
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
  const { data = [] } = useQuery({ queryKey: ["opportunities", query], queryFn: () => api.opportunities(query) });
  const deleteOpportunity = useMutation({
    mutationFn: (id: string) => api.deleteOpportunity(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
    }
  });

  return (
    <>
      <PageIntro
        title="Opportunities"
        description="Manage your active pipeline and potential leads."
        actions={
          <>
            <Link className="btn btn-secondary" to="/import">
              <MaterialIcon name="upload_file" />
              Import from Google Sheets
            </Link>
            <Link className="btn btn-primary" to="/opportunities/new">
              <MaterialIcon name="add" />
              Add Opportunity
            </Link>
          </>
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
                    <td className="px-6 py-4"><button className="text-error" onClick={() => { if (window.confirm(`Delete ${item.companyName} / ${item.roleTitle}?`)) deleteOpportunity.mutate(item.id); }}><MaterialIcon name="delete" /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

const statuses = ["RESEARCH_LEAD", "TO_APPLY", "APPLIED", "RECRUITER_REACHED_OUT", "PHONE_SCHEDULED", "PHONE_DONE", "TECHNICAL_SCHEDULED", "TECHNICAL_DONE", "HOME_ASSIGNMENT", "ASSIGNMENT_SUBMITTED", "FINAL_STAGE", "OFFER", "REJECTED", "PAUSED", "NOT_RELEVANT"];
