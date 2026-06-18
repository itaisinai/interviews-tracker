import type { Compensation, Interaction, Note, Task } from "../lib/types";
import type {
  CompensationDraft,
  NoteDraft,
  TaskDraft,
} from "../components/opportunity-detail/opportunity-detail-types";
import {
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDateTimeRange, formatDurationBetween } from "../lib/format";
import {
  getInteractionBadgeMeta,
  promoteOverdueInteractionsForRead,
} from "../lib/interaction-status";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AddInteractionModal } from "../components/add-interaction-modal";
import { Badge } from "../components/badge";
import { CompanyDetailsModern } from "../components/opportunity-detail/company-details-modern";
import { ContactsList } from "../components/contacts/contacts-list";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { InterviewPreparation } from "../components/interview-preparation";
import { PageIntro } from "../components/app-shell";
import { Timeline } from "../components/timeline";
import { api } from "../lib/api";
import { labelForPipelineType } from "../lib/enum-labels";

export function OpportunityDetailPage() {
  const { slugOrId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["opportunity", slugOrId],
    queryFn: () => api.opportunity(slugOrId),
    enabled: Boolean(slugOrId),
  });
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);

  const [noteDraft, setNoteDraft] = useState<NoteDraft>({
    title: "",
    category: "general",
    content: "",
  });
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: "",
    status: "pending",
    priority: "medium",
    dueDate: "",
    notes: "",
  });
  const [compensationDraft, setCompensationDraft] = useState<CompensationDraft>(
    {
      baseSalary: "",
      equity: "",
      bonus: "",
      offerStatus: "pending",
      negotiationNotes: "",
    },
  );

  const opportunityRouteId = data?.slug ?? data?.id ?? slugOrId;
  const opportunityDbId = data?.id ?? slugOrId;
  const canonicalSlug = data?.slug ?? null;
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["opportunity", slugOrId] });
  const deleteOpportunity = useMutation({
    mutationFn: () => api.deleteOpportunity(opportunityRouteId),
    onSuccess: () => navigate("/opportunities"),
  });
  const deleteInteraction = useMutation({
    mutationFn: (interactionId: string) => api.deleteInteraction(interactionId),
    onSuccess: refresh,
  });
  const saveCompensation = useMutation({
    mutationFn: () =>
      api.upsertCompensation({
        ...compensationDraft,
        jobOpportunityId: opportunityDbId,
      }),
    onSuccess: () => {
      setCompensationDraft({
        baseSalary: "",
        equity: "",
        bonus: "",
        offerStatus: "pending",
        negotiationNotes: "",
      });
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["compensation"] });
    },
  });
  const deleteCompensation = useMutation({
    mutationFn: (compensation: Compensation) =>
      api.deleteCompensation(compensation.id),
    onSuccess: () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["compensation"] });
    },
  });

  const displayedInteractions = useMemo(
    () => (data ? promoteOverdueInteractionsForRead(data.interactions) : []),
    [data],
  );
  const selectedInteraction = useMemo(
    () =>
      displayedInteractions.find((item) => item.id === selectedInteractionId) ??
      null,
    [displayedInteractions, selectedInteractionId],
  );
  const focusedInteraction = useMemo(() => {
    const now = Date.now();
    return (
      displayedInteractions.find(
        (item) => new Date(item.date).getTime() >= now,
      ) ??
      [...displayedInteractions].sort(
        (left, right) =>
          new Date(right.date).getTime() - new Date(left.date).getTime(),
      )[0] ??
      null
    );
  }, [displayedInteractions]);

  useEffect(() => {
    if (
      selectedInteractionId &&
      !displayedInteractions.some((item) => item.id === selectedInteractionId)
    ) {
      setSelectedInteractionId(null);
    }
  }, [displayedInteractions, selectedInteractionId]);

  useEffect(() => {
    if (canonicalSlug && canonicalSlug !== slugOrId) {
      navigate(`/opportunities/${canonicalSlug}`, { replace: true });
    }
  }, [canonicalSlug, navigate, slugOrId]);

  if (isLoading || !data) {
    return (
      <PageLoadingState
        title="Opportunity"
        description="Loading opportunity details, notes, and interaction history."
      />
    );
  }

  if (isError) {
    return (
      <PageErrorState
        title="Opportunity"
        description={
          error instanceof Error ? error.message : "Unable to load opportunity."
        }
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <PageIntro
        title={data.companyName}
        description={data.roleTitle}
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <div className="flex items-center gap-2">
              <Badge value={data.status} />
              <Badge value={data.priority} />
              <Badge value={data.pipelineType}>
                {labelForPipelineType(data.pipelineType)}
              </Badge>
            </div>
            <LoadingButton
              className="btn btn-secondary"
              icon="add"
              onClick={() => setShowAddInteractionModal(true)}
            >
              Add Interaction
            </LoadingButton>
            <Link className="btn btn-primary" to="/opportunities">
              <MaterialIcon name="arrow_back" />
              Back to Pipeline
            </Link>
            <LoadingButton
              className="btn btn-secondary text-error hover:bg-error-container"
              loading={deleteOpportunity.isPending}
              loadingLabel="Deleting..."
              icon="delete"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${data.companyName} / ${data.roleTitle}? This also deletes its interactions, notes, tasks, and compensation.`,
                  )
                )
                  deleteOpportunity.mutate();
              }}
            >
              Delete
            </LoadingButton>
          </>
        }
      />

      {focusedInteraction ? (
        <div className="mt-8">
          <FocusedInteractionCard
            interaction={focusedInteraction}
            onOpen={() => setSelectedInteractionId(focusedInteraction.id)}
          />
        </div>
      ) : null}

      <div className="mt-8">
        <InterviewPreparation opportunity={data} />
      </div>

      <div id="contacts-section" className="mt-8">
        <ContactsList
          opportunityId={opportunityDbId}
          companyName={data.companyName}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <CompanyDetailsModern opportunity={data} />
        </div>
      </div>

      <div className="mt-8">
        <Timeline
          interactions={displayedInteractions}
          selectedInteractionId={selectedInteractionId}
          onSelectInteraction={setSelectedInteractionId}
          onDeleteInteraction={(interactionId) => {
            if (window.confirm("Delete this interaction?")) {
              deleteInteraction.mutate(interactionId);
            }
          }}
          isDeletingInteraction={(interactionId) =>
            deleteInteraction.isPending &&
            deleteInteraction.variables === interactionId
          }
        />
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={
          data ? { ...data, interactions: displayedInteractions } : null
        }
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />

      <AddInteractionModal
        isOpen={showAddInteractionModal}
        onClose={() => setShowAddInteractionModal(false)}
        opportunityId={opportunityDbId}
        companyName={data.companyName}
        roleTitle={data.roleTitle}
        onSaved={() => {
          refresh();
          setShowAddInteractionModal(false);
        }}
      />
    </>
  );
}

function FocusedInteractionCard({
  interaction,
  onOpen,
}: {
  interaction: Interaction;
  onOpen: () => void;
}) {
  const badge = getInteractionBadgeMeta(interaction);
  const duration = formatDurationBetween(interaction.date, interaction.endDate);

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <MaterialIcon name="calendar_month" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
              Interview focus
            </p>
            <h2 className="mt-1 font-title-lg text-title-lg font-bold text-on-background">
              {interaction.stage || interaction.type}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
              <span>
                {formatDateTimeRange(interaction.date, interaction.endDate)}
              </span>
              {duration ? <span>· {duration}</span> : null}
              <Badge value={interaction.status} tone={badge.tone}>
                {badge.label}
              </Badge>
              <Badge value={interaction.type}>{interaction.type}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {interaction.meetingLink ? (
            <a
              className="btn btn-primary"
              href={interaction.meetingLink}
              target="_blank"
              rel="noreferrer"
            >
              <MaterialIcon name="videocam" />
              Join meeting
            </a>
          ) : null}
          <button className="btn btn-secondary" type="button" onClick={onOpen}>
            <MaterialIcon name="open_in_full" />
            Open details
          </button>
        </div>
      </div>
      {interaction.personName ? (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          {interaction.personName.split(/\s+and\s+|,\s*/).map((name) => (
            <div
              key={name}
              className="rounded-xl border border-outline-variant bg-surface-container-low/50 px-4 py-3"
            >
              <p className="font-label-md text-label-md font-bold text-on-background">
                {name}
              </p>
              {interaction.personRole ? (
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {interaction.personRole}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
