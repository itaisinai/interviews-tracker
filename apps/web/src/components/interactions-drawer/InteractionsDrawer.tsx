import type { Interaction, InteractionDraft } from "../../lib/types";
import {
  LoadingButton,
  PageErrorState,
  ProcessStateCard,
} from "../loading-state";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Badge } from "../badge";
import { GmailInteractionPanel } from "../gmail-interaction-panel";
import { InteractionDraftFields } from "./InteractionDraftFields";
import { InteractionTextParserPanel } from "./InteractionTextParserPanel";
import { MaterialIcon } from "../material-icon";
import { api } from "../../lib/api";
import { displayLabelForEnumValue, normalizeInteractionType } from "../../lib/enum-labels";
import {
  getInteractionBadgeMeta,
  promoteOverdueInteractionStatusForRead,
  promoteOverdueInteractionsForRead,
} from "../../lib/interaction-status";
import { formatDateTime } from "../../lib/format";

type InteractionsDrawerProps = {
  selectedInteraction: Interaction | null;
  onClose: () => void;
  onSelectInteraction?: (interactionId: string) => void;
};

type ComposerMode = "chooser" | "gmail" | "text" | null;

function toDraft(interaction: Interaction): InteractionDraft {
  return {
    date: interaction.date,
    type: normalizeInteractionType(interaction.type),
    stage: interaction.stage ?? null,
    status: interaction.status,
    personName: interaction.personName ?? null,
    personRole: interaction.personRole ?? null,
    agenda: interaction.agenda ?? null,
    notes: interaction.notes ?? null,
    outcome: interaction.outcome ?? null,
    followUp: interaction.followUp ?? null,
  };
}

function isUpcoming(date: string) {
  return new Date(date).getTime() >= Date.now();
}

function interactionTypeIcon(type: string) {
  const normalizedType = normalizeInteractionType(type);

  if (normalizedType === "Email") return "mail";
  if (normalizedType === "Phone Call") return "call";
  if (normalizedType === "Home Assignment") return "assignment";
  if (normalizedType === "Offer") return "payments";
  if (normalizedType === "Rejection") return "cancel";
  if (normalizedType === "Follow-up") return "reply";
  return "event";
}

function InteractionTimelineItem({
  interaction,
  selected,
  onClick,
}: {
  interaction: Interaction;
  selected: boolean;
  onClick: () => void;
}) {
  const badge = getInteractionBadgeMeta(interaction);
  return (
    <button
      type="button"
      className={`w-full rounded-xl border p-4 text-left transition-all ${selected ? "border-primary bg-primary/5 shadow-sm" : "border-outline-variant bg-white hover:border-primary/40 hover:bg-surface-container-low"}`}
      onClick={onClick}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
          {formatDateTime(interaction.date)}
        </span>
        {isUpcoming(interaction.date) ? (
          <Badge value="Upcoming" tone="warning">
            Upcoming
          </Badge>
        ) : null}
        <Badge value={interaction.status} tone={badge.tone}>
          {badge.label}
        </Badge>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <MaterialIcon name={interactionTypeIcon(interaction.type)} className="text-primary" />
        <span className="font-semibold text-on-background">
          {displayLabelForEnumValue(interaction.type) ?? interaction.type}
        </span>
      </div>
      <p className="mt-2 text-body-md text-on-surface-variant">
        {interaction.personName ?? "No person"}
        {interaction.personRole ? ` · ${interaction.personRole}` : ""}
        {interaction.stage ? ` · ${interaction.stage}` : ""}
      </p>
    </button>
  );
}

export function InteractionsDrawer({
  selectedInteraction,
  onClose,
  onSelectInteraction,
}: InteractionsDrawerProps) {
  const queryClient = useQueryClient();
  const [composer, setComposer] = useState<ComposerMode>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<InteractionDraft | null>(null);
  const [mountedInteraction, setMountedInteraction] =
    useState<Interaction | null>(selectedInteraction);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);

  const opportunityId = mountedInteraction?.jobOpportunityId ?? "";
  const opportunityQuery = useQuery({
    queryKey: ["opportunity", opportunityId],
    queryFn: () => api.opportunity(opportunityId),
    enabled: Boolean(opportunityId),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    if (openFrameRef.current) {
      window.cancelAnimationFrame(openFrameRef.current);
      openFrameRef.current = null;
    }

    if (selectedInteraction) {
      setMountedInteraction(selectedInteraction);
      setIsVisible(false);
      openFrameRef.current = window.requestAnimationFrame(() => {
        openFrameRef.current = window.requestAnimationFrame(() => {
          setIsVisible(true);
          openFrameRef.current = null;
        });
      });
      return;
    }

    setIsVisible(false);
    closeTimerRef.current = window.setTimeout(() => {
      setMountedInteraction(null);
      closeTimerRef.current = null;
    }, 620);
  }, [selectedInteraction]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
      if (openFrameRef.current) {
        window.cancelAnimationFrame(openFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setComposer(null);
    setIsEditing(false);
    setDraft(mountedInteraction ? toDraft(mountedInteraction) : null);
  }, [mountedInteraction?.id]);

  const selectedTimelineInteraction = useMemo(() => {
    const timelineInteraction = opportunityQuery.data?.interactions.find(
      (item) => item.id === mountedInteraction?.id,
    );
    return timelineInteraction ?? mountedInteraction ?? null;
  }, [opportunityQuery.data?.interactions, mountedInteraction]);

  const refreshQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: ["opportunity", opportunityId],
    });
    void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    void queryClient.invalidateQueries({ queryKey: ["interactions"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    void queryClient.invalidateQueries({ queryKey: ["companies"] });
  };

  const deleteInteraction = useMutation({
    mutationFn: (interactionId: string) => api.deleteInteraction(interactionId),
    onSuccess: () => {
      refreshQueries();
      onClose();
    },
  });

  const updateInteraction = useMutation({
    mutationFn: async () => {
      if (!selectedTimelineInteraction || !draft) {
        throw new Error("No interaction is ready to update.");
      }

      return api.updateInteraction(selectedTimelineInteraction.id, draft);
    },
    onSuccess: (savedInteraction) => {
      refreshQueries();
      setIsEditing(false);
      setDraft(toDraft(savedInteraction));
    },
  });

  if (!mountedInteraction) {
    return null;
  }

  const opportunity =
    opportunityQuery.data ?? mountedInteraction.jobOpportunity ?? null;
  const timeline = promoteOverdueInteractionsForRead(
    opportunityQuery.data?.interactions ?? opportunity?.interactions ?? [],
  );
  const displayInteraction = promoteOverdueInteractionStatusForRead(selectedTimelineInteraction ?? mountedInteraction);
  const headerStatus = displayInteraction.status;
  const headerBadge = getInteractionBadgeMeta(displayInteraction);

  const interactionsCountLabel = `${timeline.length} interaction${timeline.length !== 1 ? "s" : ""}`;

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className={`absolute inset-0 transition-[opacity,background-color,backdrop-filter] duration-500 ease-out ${isVisible ? "bg-black/20 opacity-100 backdrop-blur-[1px]" : "bg-black/0 opacity-0 backdrop-blur-0"}`}
        aria-label="Close interaction drawer"
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-outline-variant bg-[#f7f5ef] shadow-2xl will-change-transform transition-[transform,opacity] duration-500 ease-out md:w-[42rem] lg:w-[48rem] ${isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-95"}`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant bg-white px-5 py-4">
          <div className="min-w-0">
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">
              Interaction details
            </p>
            <h3 className="truncate font-title-md text-title-md font-bold">
              {opportunity?.companyName ??
                displayInteraction.jobOpportunity?.companyName ??
                "Interaction"}
            </h3>
            <p className="truncate text-body-md text-on-surface-variant">
              {opportunity?.roleTitle ??
                displayInteraction.jobOpportunity?.roleTitle ??
                "-"}
            </p>
          </div>
          <div className="flex items-start gap-2">
            {opportunity?.companyName ? (
              <Link
                className="btn btn-secondary"
                to={`/companies/${encodeURIComponent(opportunity.companyName)}`}
                title={`Open ${opportunity.companyName} company page`}
              >
                <MaterialIcon name="business" />
                Company
              </Link>
            ) : null}
            <button className="btn btn-secondary" onClick={onClose}>
              <MaterialIcon name="close" />
              Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {opportunityQuery.isLoading ? (
            <ProcessStateCard
              title="Loading drawer"
              message="Fetching the opportunity timeline."
              description="This loads only when you open an interaction."
              tone="busy"
              progress={20}
            />
          ) : opportunityQuery.isError ? (
            <PageErrorState
              title="Interaction drawer"
              description={
                opportunityQuery.error instanceof Error
                  ? opportunityQuery.error.message
                  : "Unable to load opportunity details."
              }
              onRetry={() => void opportunityQuery.refetch()}
            />
          ) : (
            <div className="space-y-6">
              <section className="rounded-2xl border border-outline-variant bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge value={displayInteraction.type} />
                      <Badge value={headerStatus} tone={headerBadge.tone}>
                        {headerBadge.label}
                      </Badge>
                      {displayInteraction.stage ? (
                        <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-on-surface-variant">
                          {displayInteraction.stage}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-headline-md text-headline-md font-bold">
                      {formatDateTime(displayInteraction.date)}
                    </p>
                    <p className="mt-1 text-body-md text-on-surface-variant">
                      {displayInteraction.personName ?? "No person"}
                      {displayInteraction.personRole
                        ? ` · ${displayInteraction.personRole}`
                        : ""}
                    </p>
                    {displayInteraction.outcome ? (
                      <div className="mt-4 rounded-xl border border-outline-variant bg-surface-container-low p-4">
                        <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                          Outcome
                        </p>
                        <p className="mt-1 text-body-md text-on-background">
                          {displayInteraction.outcome}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setComposer(null);
                        setIsEditing((current) => !current);
                      }}
                    >
                      <MaterialIcon name="edit" />
                      {isEditing ? "Close edit" : "Edit interaction"}
                    </button>
                    <LoadingButton
                      className="btn btn-secondary text-error hover:bg-error-container"
                      icon="delete"
                      loading={
                        deleteInteraction.isPending &&
                        deleteInteraction.variables === displayInteraction.id
                      }
                      onClick={() => {
                        if (window.confirm("Delete this interaction?")) {
                          deleteInteraction.mutate(displayInteraction.id);
                        }
                      }}
                    >
                      Delete interaction
                    </LoadingButton>
                  </div>
                </div>

                {isEditing && draft ? (
                  <div className="mt-5 rounded-2xl border border-outline-variant bg-surface-container-low p-4">
                    <InteractionDraftFields draft={draft} setDraft={setDraft} />
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <LoadingButton
                        className="btn btn-primary"
                        loading={updateInteraction.isPending}
                        loadingLabel="Saving..."
                        icon="save"
                        onClick={() => void updateInteraction.mutate()}
                      >
                        Save interaction
                      </LoadingButton>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setIsEditing(false);
                          setDraft(toDraft(displayInteraction));
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="rounded-2xl border border-outline-variant bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                      Opportunity timeline
                    </p>
                    <h4 className="font-title-md text-title-md font-bold">
                      {opportunity?.companyName ?? "Timeline"}
                    </h4>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface-variant">
                    {interactionsCountLabel}
                  </span>
                </div>
                <div className="mt-4 space-y-3">
                  {timeline.map((interaction) => (
                    <InteractionTimelineItem
                      key={interaction.id}
                      interaction={interaction}
                      selected={interaction.id === displayInteraction.id}
                      onClick={() => onSelectInteraction?.(interaction.id)}
                    />
                  ))}
                  {timeline.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-body-md text-on-surface-variant">
                      No interactions found for this opportunity yet.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-2xl border border-outline-variant bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-label-md text-label-md uppercase text-on-surface-variant">
                      Selected interaction
                    </p>
                    <h4 className="font-title-md text-title-md font-bold">
                      {displayInteraction.type}
                    </h4>
                  </div>
                  {composer === null ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setComposer("chooser")}
                    >
                      <MaterialIcon name="add" />
                      Add interaction
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => setComposer(null)}
                    >
                      <MaterialIcon name="close" />
                      Hide add flow
                    </button>
                  )}
                </div>

                {composer === "chooser" ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <button
                      className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      onClick={() => setComposer("gmail")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MaterialIcon name="mail" />
                        </div>
                        <div>
                          <p className="font-semibold text-on-background">
                            Import from Gmail
                          </p>
                          <p className="text-body-md text-on-surface-variant">
                            Search related emails, parse one, and review before
                            saving.
                          </p>
                        </div>
                      </div>
                    </button>
                    <button
                      className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
                      onClick={() => setComposer("text")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MaterialIcon name="edit_note" />
                        </div>
                        <div>
                          <p className="font-semibold text-on-background">
                            Paste free text
                          </p>
                          <p className="text-body-md text-on-surface-variant">
                            Parse recruiter messages, notes, or calendar text
                            into a draft.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : null}

                {composer === "gmail" ? (
                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-body-md text-on-surface-variant">
                        Use the Gmail flow for the selected opportunity.
                      </p>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setComposer("chooser")}
                      >
                        <MaterialIcon name="arrow_back" />
                        Back
                      </button>
                    </div>
                    <GmailInteractionPanel
                      opportunityId={opportunityId}
                      companyName={
                        opportunity?.companyName ??
                        displayInteraction.jobOpportunity?.companyName ??
                        ""
                      }
                      roleTitle={
                        opportunity?.roleTitle ??
                        displayInteraction.jobOpportunity?.roleTitle ??
                        ""
                      }
                      onSaved={(savedInteraction) => {
                        refreshQueries();
                        if (savedInteraction) {
                          onSelectInteraction?.(savedInteraction.id);
                        }
                        setComposer(null);
                      }}
                    />
                  </div>
                ) : null}

                {composer === "text" ? (
                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-body-md text-on-surface-variant">
                        Paste raw text and let the AI turn it into an
                        interaction draft.
                      </p>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setComposer("chooser")}
                      >
                        <MaterialIcon name="arrow_back" />
                        Back
                      </button>
                    </div>
                    <InteractionTextParserPanel
                      opportunityId={opportunityId}
                      companyName={
                        opportunity?.companyName ??
                        displayInteraction.jobOpportunity?.companyName ??
                        ""
                      }
                      roleTitle={
                        opportunity?.roleTitle ??
                        displayInteraction.jobOpportunity?.roleTitle ??
                        ""
                      }
                      onSaved={(savedInteraction) => {
                        refreshQueries();
                        if (savedInteraction) {
                          onSelectInteraction?.(savedInteraction.id);
                        }
                        setComposer(null);
                      }}
                    />
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
