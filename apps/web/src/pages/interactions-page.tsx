import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GmailInteractionPanel } from "../components/gmail-interaction-panel";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { OpportunityInteractionTimeline } from "../components/interactions-timeline";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, PageErrorState, PageLoadingState } from "../components/loading-state";
import { MaterialIcon } from "../components/material-icon";
import { api } from "../lib/api";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import type { Interaction } from "../lib/types";

type InteractionOpportunityGroup = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  interactions: Interaction[];
  latestTimestamp: number;
};

function buildOpportunityGroups(interactions: readonly Interaction[]) {
  const groups = new Map<string, InteractionOpportunityGroup>();

  for (const interaction of interactions) {
    const existing = groups.get(interaction.jobOpportunityId);
    const timestamp = new Date(interaction.date).getTime();

    if (!existing) {
      groups.set(interaction.jobOpportunityId, {
        opportunityId: interaction.jobOpportunityId,
        companyName: interaction.jobOpportunity?.companyName ?? "Unknown company",
        roleTitle: interaction.jobOpportunity?.roleTitle ?? "Unknown role",
        interactions: [interaction],
        latestTimestamp: timestamp
      });
      continue;
    }

    existing.interactions.push(interaction);
    existing.latestTimestamp = Math.max(existing.latestTimestamp, timestamp);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.latestTimestamp !== right.latestTimestamp) {
      return right.latestTimestamp - left.latestTimestamp;
    }

    return left.companyName.localeCompare(right.companyName) || left.roleTitle.localeCompare(right.roleTitle);
  });
}

function filterOpportunityGroup(group: InteractionOpportunityGroup, filter: string) {
  if (filter === "upcoming") {
    return group.interactions.some((item) => new Date(item.date) >= new Date());
  }

  if (filter === "done") {
    return group.interactions.some((item) => item.status === "DONE");
  }

  if (filter === "followup") {
    return group.interactions.some((item) => item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim()));
  }

  return true;
}

export function InteractionsPage() {
  const [filter, setFilter] = useState("upcoming");
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailOpportunityId, setGmailOpportunityId] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["interactions"], queryFn: api.interactions });
  const opportunitiesQuery = useQuery({ queryKey: ["opportunities", "gmail-import"], queryFn: () => api.opportunities("?summary=1"), staleTime: 30_000 });
  const { data: opportunities = [] } = opportunitiesQuery;
  const displayInteractions = useMemo(() => promoteOverdueInteractionsForRead(data), [data]);
  const opportunityGroups = useMemo(() => buildOpportunityGroups(displayInteractions), [displayInteractions]);
  const visibleOpportunityGroups = useMemo(() => opportunityGroups.filter((group) => filterOpportunityGroup(group, filter)), [filter, opportunityGroups]);
  const gmailOpportunity = useMemo(() => opportunities.find((item) => item.id === gmailOpportunityId) ?? null, [gmailOpportunityId, opportunities]);
  const deleteInteraction = useMutation({
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  });
  const selectedInteraction = useMemo(() => displayInteractions.find((item) => item.id === selectedInteractionId) ?? null, [displayInteractions, selectedInteractionId]);
  const followUpCount = displayInteractions.filter((item) => item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim())).length;
  const followUpPercent = displayInteractions.length > 0 ? Math.round((followUpCount / displayInteractions.length) * 100) : 0;

  useEffect(() => {
    if (selectedInteractionId && !displayInteractions.some((item) => item.id === selectedInteractionId)) {
      setSelectedInteractionId(null);
    }
  }, [displayInteractions, selectedInteractionId]);

  function openGmailImport() {
    const initialOpportunityId = gmailOpportunityId || opportunities[0]?.id || "";
    setGmailOpportunityId(initialOpportunityId);
    setShowGmailImport(true);
  }

  if (isLoading || opportunitiesQuery.isLoading) {
    return <PageLoadingState title="Interactions" description="Loading interactions and available opportunities." />;
  }

  if (isError) {
    return <PageErrorState title="Interactions" description={error instanceof Error ? error.message : "Unable to load interactions."} onRetry={() => void refetch()} />;
  }

  if (opportunitiesQuery.isError) {
    return <PageErrorState title="Interactions" description={opportunitiesQuery.error instanceof Error ? opportunitiesQuery.error.message : "Unable to load opportunities for the form."} onRetry={() => void opportunitiesQuery.refetch()} />;
  }

  return (
    <>
      <div className="md:hidden">
        <section className="mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Interactions</h1>
              <p className="font-body-md text-on-surface-variant">Track networking and interview progress.</p>
            </div>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={`rounded-full px-4 py-2 font-label-md text-label-md ${showGmailImport ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`} onClick={() => (showGmailImport ? setShowGmailImport(false) : openGmailImport())}>
              <MaterialIcon name="mail" />
              {showGmailImport ? "Hide Gmail" : "Gmail"}
            </button>
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-3 flex overflow-x-auto gap-3 pb-1 hide-scrollbar">
            {[
              ["upcoming", "Upcoming"],
              ["done", "Passed"],
              ["followup", "Waiting for response"],
              ["all", "All"]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-label-md text-label-md transition-all ${
                  filter === key ? "bg-primary text-on-primary" : "border border-outline-variant bg-white text-on-surface-variant"
                }`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="font-label-md text-label-md uppercase text-on-surface-variant">Upcoming</div>
              <div className="mt-2 font-headline-md text-headline-md font-bold">{displayInteractions.filter((item) => new Date(item.date) >= new Date()).length}</div>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="font-label-md text-label-md uppercase text-on-surface-variant">Waiting for response</div>
              <div className="mt-2 font-headline-md text-headline-md font-bold">{followUpPercent}%</div>
            </div>
          </div>
        </section>

        {showGmailImport ? (
          <section className="mb-5 rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h3 className="font-title-md text-title-md font-bold">Add interaction from Gmail</h3>
              <p className="mt-1 text-body-md text-on-surface-variant">Pick an opportunity, search Gmail, then review before saving.</p>
            </div>
            <Field label="Opportunity">
              <select className="input" value={gmailOpportunityId} onChange={(event) => setGmailOpportunityId(event.target.value)}>
                <option value="">Select company / role</option>
                {opportunities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.companyName} · {item.roleTitle}
                  </option>
                ))}
              </select>
            </Field>
            {gmailOpportunity ? (
              <div className="mt-4">
                <GmailInteractionPanel
                  opportunityId={gmailOpportunity.id}
                  companyName={gmailOpportunity.companyName}
                  roleTitle={gmailOpportunity.roleTitle}
                  onSaved={() => {
                    setShowGmailImport(false);
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-body-md text-on-surface-variant">
                Choose an opportunity to search Gmail for related emails.
              </div>
            )}
          </section>
        ) : null}

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title-md text-title-md font-bold">Opportunity timelines</h2>
            <span className="font-label-md text-label-md text-on-surface-variant">{visibleOpportunityGroups.length}</span>
          </div>
          <div className="space-y-4">
            {visibleOpportunityGroups.map((group) => (
              <OpportunityInteractionTimeline
                key={group.opportunityId}
                companyName={group.companyName}
                roleTitle={group.roleTitle}
                interactions={group.interactions}
                selectedInteractionId={selectedInteractionId}
                onSelectInteraction={setSelectedInteractionId}
                onDeleteInteraction={(interactionId) => deleteInteraction.mutate(interactionId)}
                isDeletingInteraction={(interactionId) => deleteInteraction.isPending && deleteInteraction.variables === interactionId}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <PageIntro
          title="Interactions"
          description="Track your networking and interview progress with precision."
          actions={
            <>
              {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
              <button className="btn btn-secondary" onClick={() => (showGmailImport ? setShowGmailImport(false) : openGmailImport())}>
                <MaterialIcon name="mail" />
                {showGmailImport ? "Hide Gmail Import" : "Add interaction from Gmail"}
              </button>
            </>
          }
        />
        {showGmailImport ? (
          <section className="panel mb-8 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <MaterialIcon name="mail" />
              </div>
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold">Add interaction from Gmail</h3>
                <p className="text-body-md text-on-surface-variant">Pick an opportunity, search Gmail for recent emails, then review the parsed interaction before saving.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <Field label="Opportunity">
                <select className="input" value={gmailOpportunityId} onChange={(event) => setGmailOpportunityId(event.target.value)}>
                  <option value="">Select company / role</option>
                  {opportunities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.companyName} · {item.roleTitle}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-center gap-3">
                <button className="btn btn-secondary" onClick={() => setShowGmailImport(false)}>
                  <MaterialIcon name="close" />
                  Close
                </button>
              </div>
            </div>
            {gmailOpportunity ? (
              <div className="mt-6">
                <GmailInteractionPanel
                  opportunityId={gmailOpportunity.id}
                  companyName={gmailOpportunity.companyName}
                  roleTitle={gmailOpportunity.roleTitle}
                  onSaved={() => {
                    setShowGmailImport(false);
                  }}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
                Choose an opportunity to search Gmail for related emails.
              </div>
            )}
          </section>
        ) : null}
        <div className="mb-8 flex flex-wrap gap-2">
          {[
            ["upcoming", "Upcoming"],
            ["done", "Passed"],
            ["followup", "Waiting for response"],
            ["all", "All"]
          ].map(([key, label]) => <button key={key} className={`rounded-full px-4 py-1.5 font-label-md text-label-md transition-all ${filter === key ? "bg-primary-container text-on-primary-container" : "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low"}`} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                <MaterialIcon name="event" filled />
              </div>
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold">Opportunity timelines</h3>
                <p className="text-body-md text-on-surface-variant">Each opportunity is grouped into its own timeline.</p>
              </div>
            </div>

            <div className="space-y-6">
              {visibleOpportunityGroups.map((group) => (
                <OpportunityInteractionTimeline
                  key={group.opportunityId}
                  companyName={group.companyName}
                  roleTitle={group.roleTitle}
                  interactions={group.interactions}
                  selectedInteractionId={selectedInteractionId}
                  onSelectInteraction={setSelectedInteractionId}
                  onDeleteInteraction={(interactionId) => deleteInteraction.mutate(interactionId)}
                  isDeletingInteraction={(interactionId) => deleteInteraction.isPending && deleteInteraction.variables === interactionId}
                />
              ))}
            </div>
          </section>
          <aside className="space-y-6 lg:col-span-4">
            <div className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-title-md text-title-md font-bold">Interaction Health</h3>
              <div className="mb-6 rounded-xl bg-surface-container-low p-4">
                <p className="font-label-md text-label-md text-on-surface-variant">Needs Follow-up</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-headline-md text-headline-md font-bold">{followUpPercent}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${followUpPercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total" value={data.length} />
                <StatCard label="Upcoming" value={data.filter((item) => new Date(item.date) >= new Date()).length} />
                <StatCard label="Passed" value={data.filter((item) => item.status === "DONE").length} />
                <StatCard label="Waiting" value={followUpCount} />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={(interactionId) => setSelectedInteractionId(interactionId)}
      />
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-md text-label-md uppercase text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4 text-center">
      <div className="font-headline-md text-headline-md font-bold text-on-background">{value}</div>
      <div className="mt-1 font-label-md text-label-md text-on-surface-variant">{label}</div>
    </div>
  );
}
