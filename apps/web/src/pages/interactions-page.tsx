import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";

export function InteractionsPage() {
  const [filter, setFilter] = useState("upcoming");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    jobOpportunityId: "",
    date: "",
    type: "Recruiter Call",
    stage: "Intro",
    status: "SCHEDULED",
    personName: "",
    personRole: "",
    agenda: "",
    notes: "",
    outcome: "",
    followUp: ""
  });
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["interactions"], queryFn: api.interactions });
  const { data: opportunities = [] } = useQuery({ queryKey: ["opportunities", "interaction-form"], queryFn: () => api.opportunities() });
  const createInteraction = useMutation({
    mutationFn: () => api.createGlobalInteraction(form),
    onSuccess: () => {
      setShowForm(false);
      setForm({
        jobOpportunityId: "",
        date: "",
        type: "Recruiter Call",
        stage: "Intro",
        status: "SCHEDULED",
        personName: "",
        personRole: "",
        agenda: "",
        notes: "",
        outcome: "",
        followUp: ""
      });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  });
  const deleteInteraction = useMutation({
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  });
  const rows = useMemo(() => data.filter((item) => {
    if (filter === "upcoming") return new Date(item.date) >= new Date();
    if (filter === "done") return item.status === "DONE";
    if (filter === "followup") return item.status === "NEEDS_FOLLOW_UP";
    return true;
  }), [data, filter]);
  const followUpCount = data.filter((item) => item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim())).length;
  const followUpPercent = data.length > 0 ? Math.round((followUpCount / data.length) * 100) : 0;

  return (
    <>
      <PageIntro title="Interactions" description="Track your networking and interview progress with precision." actions={<button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}><MaterialIcon name={showForm ? "close" : "add"} />{showForm ? "Close" : "Add Interaction"}</button>} />
      {showForm ? (
        <section className="panel mb-8 p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <MaterialIcon name="add_call" />
            </div>
            <div>
              <h3 className="font-title-md text-title-md font-bold">Add Interaction</h3>
              <p className="text-body-md text-on-surface-variant">Attach the interaction to an existing opportunity.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Field label="Opportunity">
              <select className="input" value={form.jobOpportunityId} onChange={(event) => setForm({ ...form, jobOpportunityId: event.target.value })}>
                <option value="">Select company / role</option>
                {opportunities.map((item) => <option key={item.id} value={item.id}>{item.companyName} · {item.roleTitle}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input className="input" type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
            </Field>
            <Field label="Type">
              <input className="input" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} />
            </Field>
            <Field label="Stage">
              <input className="input" value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })} />
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option>SCHEDULED</option>
                <option>DONE</option>
                <option>CANCELLED</option>
                <option>NEEDS_FOLLOW_UP</option>
              </select>
            </Field>
            <Field label="Person">
              <input className="input" value={form.personName} onChange={(event) => setForm({ ...form, personName: event.target.value })} placeholder="Recruiter, hiring manager..." />
            </Field>
            <Field label="Person role">
              <input className="input" value={form.personRole} onChange={(event) => setForm({ ...form, personRole: event.target.value })} />
            </Field>
            <Field label="Agenda">
              <textarea className="input min-h-24" value={form.agenda} onChange={(event) => setForm({ ...form, agenda: event.target.value })} />
            </Field>
            <Field label="Follow-up">
              <textarea className="input min-h-24" value={form.followUp} onChange={(event) => setForm({ ...form, followUp: event.target.value })} />
            </Field>
            <Field label="Notes">
              <textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
            <Field label="Outcome">
              <textarea className="input min-h-24" value={form.outcome} onChange={(event) => setForm({ ...form, outcome: event.target.value })} />
            </Field>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button className="btn btn-primary" disabled={!form.jobOpportunityId || !form.date || createInteraction.isPending} onClick={() => createInteraction.mutate()}>
              <MaterialIcon name="save" />
              {createInteraction.isPending ? "Saving..." : "Save Interaction"}
            </button>
            {createInteraction.error ? <p className="text-body-md text-error">{createInteraction.error.message}</p> : null}
          </div>
        </section>
      ) : null}
      <div className="mb-8 flex flex-wrap gap-2">
        {[
          ["upcoming", "Upcoming"],
          ["done", "Done"],
          ["followup", "Needs Follow-up"],
          ["all", "All"]
        ].map(([key, label]) => <button key={key} className={`rounded-full px-4 py-1.5 font-label-md text-label-md transition-all ${filter === key ? "bg-primary-container text-on-primary-container" : "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low"}`} onClick={() => setFilter(key)}>{label}</button>)}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="relative timeline-track lg:col-span-8">
          <div className="relative z-10 mb-6 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
              <MaterialIcon name="event" filled />
            </div>
            <h3 className="font-title-md text-title-md font-bold">{filter === "upcoming" ? "Upcoming" : "Interaction Timeline"}</h3>
          </div>
          <div className="ml-10 space-y-4">
            {rows.map((item) => (
              <article key={item.id} className={`rounded-xl bg-white p-5 shadow-sm transition-all hover:shadow-lg ${item.status === "SCHEDULED" ? "border-2 border-primary" : "border border-outline-variant"}`}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">{formatDateTime(item.date)}</span>
                  <span className="h-1 w-1 rounded-full bg-outline-variant" />
                  <MaterialIcon name={item.type.toLowerCase().includes("email") ? "mail" : "call"} className="text-primary" />
                  <span className="font-semibold">{item.type}</span>
                  <Badge value={item.status} />
                </div>
                <h4 className="font-headline-md text-headline-md">{item.jobOpportunity?.companyName}</h4>
                <p className="text-body-md text-on-surface-variant">{item.jobOpportunity?.roleTitle} · {item.stage ?? "No stage"} · {item.personName ?? "No person"}</p>
                {item.agenda ? <p className="mt-3 text-body-md">{item.agenda}</p> : null}
                {item.followUp ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md italic">"{item.followUp}"</p> : null}
                <button className="mt-3 inline-flex items-center gap-1 font-label-md text-label-md text-error" onClick={() => { if (window.confirm("Delete this interaction?")) deleteInteraction.mutate(item.id); }}>
                  <MaterialIcon name="delete" className="text-[16px]" />
                  Delete
                </button>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-4">
          <div className="panel p-6">
            <h4 className="mb-6 font-title-md text-title-md font-bold">Interaction Health</h4>
            <div className="mb-6">
              <div className="mb-1 flex justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">Needs Follow-up</span>
                <span className="text-primary">{followUpPercent}%</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${followUpPercent}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Total" value={data.length} />
              <Stat label="Upcoming" value={data.filter((item) => new Date(item.date) >= new Date()).length} />
              <Stat label="Done" value={data.filter((item) => item.status === "DONE").length} />
              <Stat label="Follow-up" value={followUpCount} />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-surface-container-low p-4 text-center"><span className="block font-headline-md text-headline-md font-bold">{value}</span><span className="font-label-md text-label-md text-on-surface-variant">{label}</span></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1"><span className="label">{label}</span>{children}</label>;
}
