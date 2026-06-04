import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { api } from "../lib/api";
import { formatDateTime, titleize } from "../lib/format";

export function CompanyDetailPage() {
  const { companyName = "" } = useParams();
  const decodedName = decodeURIComponent(companyName);
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [showEnrich, setShowEnrich] = useState(false);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["company", decodedName], queryFn: () => api.company(decodedName), enabled: Boolean(decodedName) });
  const enrich = useMutation({
    mutationFn: () => api.enrichCompany(decodedName, text),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company", decodedName] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  });
  const deleteCompany = useMutation({ mutationFn: () => api.deleteCompany(decodedName), onSuccess: () => navigate("/companies") });
  const deleteOpportunity = useMutation({ mutationFn: (id: string) => api.deleteOpportunity(id), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["company", decodedName] }); void queryClient.invalidateQueries({ queryKey: ["companies"] }); } });
  const deleteInteraction = useMutation({ mutationFn: (id: string) => api.deleteInteraction(id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["company", decodedName] }) });

  if (isLoading || !data) return <p className="text-on-surface-variant">Loading company...</p>;

  const primary = data.opportunities[0];
  const domains = [...new Set(data.opportunities.flatMap((item) => item.domains.map((domain) => domain.domain.label)))];

  return (
    <>
      <PageIntro
        title={data.companyName}
        description={`${data.opportunities.length} role${data.opportunities.length === 1 ? "" : "s"} · ${data.interactions.length} interaction${data.interactions.length === 1 ? "" : "s"}`}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => setShowEnrich((value) => !value)}><MaterialIcon name="auto_awesome" />Enrich</button>
            <button className="btn btn-secondary text-error hover:bg-error-container" onClick={() => { if (window.confirm(`Delete ${data.companyName} and all its opportunities/interactions?`)) deleteCompany.mutate(); }}><MaterialIcon name="delete" />Delete Company</button>
            <Link className="btn btn-secondary" to="/companies"><MaterialIcon name="arrow_back" />Companies</Link>
          </>
        }
      />

      {showEnrich ? (
        <section className="panel mb-8 p-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-tertiary/10 p-2 text-tertiary"><MaterialIcon name="auto_awesome" /></div>
            <div>
              <h3 className="font-title-md text-title-md font-bold">Enrich Company Profile</h3>
              <p className="text-body-md text-on-surface-variant">Paste company notes, website text, recruiter messages, or job descriptions. The LLM will extract structured company fields and update this company.</p>
            </div>
          </div>
          <textarea className="input min-h-48 bg-surface-container-low" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste company research text..." />
          <div className="mt-4 flex items-center gap-3">
            <button className="btn btn-primary" disabled={text.length < 20 || enrich.isPending} onClick={() => enrich.mutate()}><MaterialIcon name="psychology" />{enrich.isPending ? "Enriching..." : "Extract and Update"}</button>
            {enrich.data ? <span className="text-body-md text-primary">Updated {enrich.data.updatedOpportunities} opportunity record(s).</span> : null}
            {enrich.error ? <span className="text-body-md text-error">{enrich.error.message}</span> : null}
          </div>
          {enrich.data ? <pre className="mt-4 max-h-80 overflow-auto rounded-lg bg-surface-container-low p-4 font-geist text-xs text-on-surface-variant">{JSON.stringify(enrich.data.enrichment, null, 2)}</pre> : null}
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">Company Profile</h3>
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
                <div className="flex items-center justify-between gap-3"><p className="font-semibold">{item.roleTitle}</p><div className="flex items-center gap-2"><Badge value={item.status} /><button className="text-error" onClick={(event) => { event.preventDefault(); if (window.confirm(`Delete ${item.roleTitle}?`)) deleteOpportunity.mutate(item.id); }}><MaterialIcon name="delete" /></button></div></div>
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
              <button className="mt-3 inline-flex items-center gap-1 font-label-md text-label-md text-error" onClick={() => { if (window.confirm("Delete this interaction?")) deleteInteraction.mutate(item.id); }}><MaterialIcon name="delete" className="text-[16px]" />Delete interaction</button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return <div className="mt-4"><p className="label">{label}</p><p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">{value || "-"}</p></div>;
}
