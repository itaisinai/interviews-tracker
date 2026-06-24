import {
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";
import type { Interaction, Opportunity, Person } from "../lib/types";
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
import type { FormEvent } from "react";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { InterviewPreparation } from "../components/interview-preparation";
import { PageIntro } from "../components/app-shell";
import { ParticipantsCard } from "../components/interactions-drawer/participants-card";
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
  const updateOpportunityTitle = useMutation({
    mutationFn: (updates: Pick<Opportunity, "companyName" | "roleTitle">) => {
      if (!data) {
        throw new Error("Opportunity is not loaded");
      }
      return api.updateOpportunity(
        opportunityRouteId,
        buildOpportunityInput(data, updates),
      );
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["opportunity", slugOrId], updated);
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (updated.slug && updated.slug !== slugOrId) {
        navigate(`/opportunities/${updated.slug}`, { replace: true });
      }
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
        description="Loading opportunity details, interaction history."
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
        title={
          <EditableTitleField
            ariaLabel="Company name"
            className="font-headline-lg text-headline-lg text-on-background"
            value={data.companyName}
            isSaving={updateOpportunityTitle.isPending}
            onSave={(companyName) =>
              updateOpportunityTitle.mutate({
                companyName,
                roleTitle: data.roleTitle,
              })
            }
          />
        }
        description={
          <EditableTitleField
            ariaLabel="Role title"
            className="font-body-lg text-body-lg text-on-surface-variant"
            value={data.roleTitle}
            isSaving={updateOpportunityTitle.isPending}
            onSave={(roleTitle) =>
              updateOpportunityTitle.mutate({
                companyName: data.companyName,
                roleTitle,
              })
            }
          />
        }
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
                    `Delete ${data.companyName} / ${data.roleTitle}? This also deletes its interactions.`,
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
            opportunityId={opportunityDbId}
            opportunityCompanyName={data.companyName}
            onOpen={() => setSelectedInteractionId(focusedInteraction.id)}
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
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
          <div id="contacts-section">
            <ContactsList
              opportunityId={opportunityDbId}
              companyName={data.companyName}
            />
          </div>
          <InterviewPreparation opportunity={data} />
        </div>
        <div>
          <CompanyDetailsModern opportunity={data} />
        </div>
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

function EditableTitleField({
  ariaLabel,
  className,
  value,
  isSaving,
  onSave,
}: {
  ariaLabel: string;
  className: string;
  value: string;
  isSaving: boolean;
  onSave: (value: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!isEditing) {
      setDraft(value);
    }
  }, [isEditing, value]);

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }
    onSave(trimmed);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <form
        className="group/title-edit flex max-w-full items-center gap-2"
        onSubmit={submit}
      >
        <input
          aria-label={ariaLabel}
          autoFocus
          className={`${className} min-w-0 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20`}
          disabled={isSaving}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              cancel();
            }
          }}
        />
        <button
          aria-label={`Save ${ariaLabel.toLowerCase()}`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary-container disabled:opacity-50"
          disabled={isSaving || !draft.trim()}
          type="submit"
        >
          <MaterialIcon name="check" />
        </button>
        <button
          aria-label={`Cancel ${ariaLabel.toLowerCase()} edit`}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container"
          disabled={isSaving}
          type="button"
          onClick={cancel}
        >
          <MaterialIcon name="close" />
        </button>
      </form>
    );
  }

  return (
    <span className="group/title-edit inline-flex max-w-full items-center gap-2">
      <span className={className}>{value}</span>
      <button
        aria-label={`Edit ${ariaLabel.toLowerCase()}`}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-on-surface-variant opacity-0 transition hover:bg-surface-container group-hover/title-edit:opacity-100 focus:opacity-100"
        disabled={isSaving}
        type="button"
        onClick={() => setIsEditing(true)}
      >
        <MaterialIcon name="edit" className="text-[18px]" />
      </button>
    </span>
  );
}

function buildOpportunityInput(
  opportunity: Opportunity,
  updates: Pick<Opportunity, "companyName" | "roleTitle">,
) {
  return {
    companyName: updates.companyName,
    companySearchName: opportunity.companySearchName ?? null,
    roleTitle: updates.roleTitle,
    pipelineType: opportunity.pipelineType,
    status: opportunity.status,
    priority: opportunity.priority,
    referrerOrConnection: opportunity.referrerOrConnection ?? null,
    source: opportunity.source ?? null,
    jobUrl: opportunity.jobUrl ?? null,
    linkedinUrl: opportunity.linkedinUrl ?? null,
    nextStep: opportunity.nextStep ?? null,
    notes: opportunity.notes ?? null,
    employeesRangeId: opportunity.employeesRange?.id ?? null,
    companyStageId: opportunity.companyStage?.id ?? null,
    workModelId: opportunity.workModel?.id ?? null,
    location: opportunity.location ?? null,
    funding: opportunity.funding ?? null,
    companyDescription: opportunity.companyDescription ?? null,
    productDescription: opportunity.productDescription ?? null,
    customersTraction: opportunity.customersTraction ?? null,
    techStack: opportunity.techStack ?? null,
    backendFrontendSplit: opportunity.backendFrontendSplit ?? null,
    compensationNotes: opportunity.compensationNotes ?? null,
    domainIds: opportunity.domains.map((item) => item.domain.id),
  };
}

function FocusedInteractionCard({
  interaction,
  opportunityId,
  opportunityCompanyName,
  onOpen,
}: {
  interaction: Interaction;
  opportunityId: string;
  opportunityCompanyName: string;
  onOpen: () => void;
}) {
  const badge = getInteractionBadgeMeta(interaction);
  const duration = formatDurationBetween(interaction.date, interaction.endDate);

  // Fetch contacts to get job titles and research status
  const { data: contacts = [] } = useQuery({
    queryKey: ["opportunity-contacts", opportunityId],
    queryFn: () => api.getOpportunityContacts(opportunityId),
  });

  // Parse participant names
  const personNames = interaction.personName
    ? interaction.personName.split(/\s+and\s+|,\s*/).map((name) => name.trim())
    : [];

  // Match contacts by name with multiple strategies
  const personRecords = personNames.map((name) => {
    // If name looks like an email, match by email
    const isEmail = name.includes("@");
    if (isEmail) {
      return (contacts as Person[]).find((c) => c.email === name);
    }

    // Otherwise, try multiple name matching strategies:
    // 1. Exact match
    const exactMatch = (contacts as Person[]).find((c) => c.name === name);
    if (exactMatch) return exactMatch;

    // 2. Case-insensitive match
    const caseInsensitiveMatch = (contacts as Person[]).find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    // 3. First name match (e.g., "Rotem Zikorel" matches "Rotem")
    const firstNameMatch = (contacts as Person[]).find((c) => {
      const contactFirstName = c.name.split(' ')[0]?.toLowerCase();
      const nameFirstName = name.split(' ')[0]?.toLowerCase();
      return contactFirstName === nameFirstName;
    });
    if (firstNameMatch) return firstNameMatch;

    // 4. Full name contains contact name (e.g., "Rotem Zikorel" contains "Rotem")
    const containsMatch = (contacts as Person[]).find((c) => {
      const nameLower = name.toLowerCase();
      const contactNameLower = c.name.toLowerCase();
      return nameLower.includes(contactNameLower) || contactNameLower.includes(nameLower);
    });

    return containsMatch;
  });

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
            <h2 className="mt-1 font-title-xl text-title-xl font-bold text-on-background">
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
      {personNames.length > 0 ? (
        <div className="mt-5">
          <ParticipantsCard
            personNames={personNames}
            personRecords={personRecords}
            opportunityId={opportunityId}
            opportunityCompanyName={opportunityCompanyName}
          />
        </div>
      ) : null}
    </section>
  );
}
