import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import type { Option } from "../lib/types";

const lists = [
  ["Domains", "domain", "domains", "category"],
  ["Company sizes", "company-size", "companySizes", "groups"],
  ["Company stages", "company-stage", "companyStages", "rocket_launch"],
  ["Work models", "work-model", "workModels", "home_work"],
  ["Interaction types", "interaction-type", "interactionTypes", "forum"],
  ["Interview stages", "interview-stage", "interviewStages", "timeline"]
] as const;

export function SettingsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["options"], queryFn: api.options });
  if (isLoading) {
    return <PageLoadingState title="Settings" description="Loading domains, sizes, stages, and work models." />;
  }

  if (isError) {
    return <PageErrorState title="Settings" description={error instanceof Error ? error.message : "Unable to load settings."} onRetry={() => void refetch()} />;
  }
  return (
    <>
      <PageIntro title="Settings" description="Manage data options used by forms, filters, and parsed AI output." actions={isFetching ? <InlineLoadingState label="Refreshing" /> : undefined} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {lists.map(([title, kind, key, icon]) => <OptionList key={kind} title={title} kind={kind} icon={icon} items={(data?.[key] ?? []) as Option[]} />)}
      </div>
    </>
  );
}

function OptionList({ title, kind, icon, items }: { title: string; kind: string; icon: string; items: Option[] }) {
  const [label, setLabel] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({ mutationFn: () => kind === "domain" ? api.addDomain(label) : api.addOption(kind, label), onSuccess: () => { setLabel(""); void queryClient.invalidateQueries({ queryKey: ["options"] }); } });
  const deleteOption = useMutation({ mutationFn: (id: string) => api.deleteOption(kind, id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["options"] }) });
  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary"><MaterialIcon name={icon} /></div>
        <h3 className="font-title-md text-title-md font-bold">{title}</h3>
      </div>
      <div className="flex gap-2">
        <input className="input bg-surface-container-low" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Add option" />
        <LoadingButton className="btn btn-primary" loading={mutation.isPending} loadingLabel="Adding..." onClick={() => mutation.mutate()} icon="add">Add</LoadingButton>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{items.map((item) => <span key={item.id} className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">{item.label}<LoadingButton compact aria-label={`Delete option ${item.label}`} className="text-error" icon="close" loading={deleteOption.isPending && deleteOption.variables === item.id} onClick={() => { if (window.confirm(`Delete option "${item.label}"? Existing records will be detached from it.`)) deleteOption.mutate(item.id); }} /></span>)}</div>
    </section>
  );
}
