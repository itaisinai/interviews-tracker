import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";

import {
  Button,
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";

import { AddInteractionModal } from "../components/add-interaction-modal";
import { PageIntro, useBreadcrumbs } from "../components/app-shell";
import { Badge } from "../components/badge";
import { ContactsList } from "../components/contacts/contacts-list";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { ParticipantsCard } from "../components/interactions-drawer/participants-card";
import { InterviewPreparation } from "../components/interview-preparation";
import { CompanyDetailsModern } from "../components/opportunity-detail/company-details-modern";
import { Timeline } from "../components/timeline";
import { api } from "../lib/api";
import { labelForPipelineType } from "../lib/enum-labels";
import { formatDateTimeRange, formatDurationBetween } from "../lib/format";
import { getInteractionBadgeMeta, promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import type { Interaction, Opportunity, Person } from "../lib/types";

export function OpportunityDetailPage() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["opportunity", slug],
    queryFn: () => api.opportunity(slug),
    enabled: Boolean(slug),
  });
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [isInteractionOperationPending, setIsInteractionOperationPending] = useState(false);

  // Slug-first architecture: use slug for all operations
  const opportunitySlug = data?.slug ?? slug;
  const canonicalSlug = data?.slug ?? null;
  const [selectedInteractionSlug, setSelectedInteractionSlug] = useState<string | null>(null);
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["opportunity", slug] });
  const deleteOpportunity = useMutation({
    mutationFn: () => api.deleteOpportunity(opportunitySlug),
    onSuccess: () => navigate("/opportunities"),
  });
  const deleteInteraction = useMutation({
    mutationFn: (interactionSlug: string) => api.deleteInteraction(interactionSlug),
    onMutate: () => setIsInteractionOperationPending(true),
    onSuccess: refresh,
    onSettled: () => setIsInteractionOperationPending(false),
  });
  const updateOpportunityTitle = useMutation({
    mutationFn: (updates: Pick<Opportunity, "roleTitle">) => {
      if (!data) {
        throw new Error("Opportunity is not loaded");
      }
      return api.updateOpportunity(opportunitySlug, buildOpportunityInput(data, updates));
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["opportunity", slug], updated);
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (updated.slug && updated.slug !== slug) {
        navigate(`/opportunities/${updated.slug}`, { replace: true });
      }
    },
  });

  const displayedInteractions = useMemo(
    () => (data ? promoteOverdueInteractionsForRead(data.interactions) : []),
    [data]
  );
  const selectedInteraction = useMemo(
    () => displayedInteractions.find((item) => item.slug === selectedInteractionSlug) ?? null,
    [displayedInteractions, selectedInteractionSlug]
  );
  const focusedInteraction = useMemo(() => {
    const now = Date.now();
    return (
      displayedInteractions.find((item) => new Date(item.date).getTime() >= now) ??
      [...displayedInteractions].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
      )[0] ??
      null
    );
  }, [displayedInteractions]);

  useEffect(() => {
    if (selectedInteractionSlug && !displayedInteractions.some((item) => item.slug === selectedInteractionSlug)) {
      setSelectedInteractionSlug(null);
    }
  }, [displayedInteractions, selectedInteractionSlug]);

  useEffect(() => {
    if (canonicalSlug && canonicalSlug !== slug) {
      navigate(`/opportunities/${canonicalSlug}`, { replace: true });
    }
  }, [canonicalSlug, navigate, slug]);

  useEffect(() => {
    if (data) {
      setBreadcrumbs([
        {
          label: "Opportunities",
          element: (
            <Link to="/opportunities" className="font-medium text-primary transition-colors hover:text-primary/80">
              Opportunities
            </Link>
          ),
        },
        {
          label: data.company.name,
          element: (
            <Link
              to={`/companies/${data.company.slug}`}
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {data.company.name}
            </Link>
          ),
        },
        { label: data.roleTitle },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [data, setBreadcrumbs]);

  if (isLoading || !data) {
    return <PageLoadingState title="Opportunity" description="Loading opportunity details, interaction history." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Opportunity"
        description={error instanceof Error ? error.message : "Unable to load opportunity."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      {/* Mobile header */}
      <div className="mb-4 md:hidden">
        <h1 className="text-2xl font-bold text-on-background">{data.company.name}</h1>
        <p className="mt-1 text-body-md text-on-surface-variant">{data.roleTitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge value={data.status} />
          <Badge value={data.priority} />
          <Badge value={data.pipelineType}>{labelForPipelineType(data.pipelineType)}</Badge>
        </div>
        <div className="mt-4 flex gap-2">
          <LoadingButton
            className="btn btn-secondary flex-1"
            icon="add"
            onClick={() => setShowAddInteractionModal(true)}
          >
            Add Interaction
          </LoadingButton>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:block">
        <PageIntro
          title={
            <EditableTitleField
              ariaLabel="Company name"
              className="font-headline-lg text-headline-lg text-on-background"
              value={data.company.name}
              isSaving={updateOpportunityTitle.isPending}
              onSave={(companyName) =>
                updateOpportunityTitle.mutate({
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
                <Badge value={data.pipelineType}>{labelForPipelineType(data.pipelineType)}</Badge>
              </div>
              <LoadingButton className="btn btn-secondary" icon="add" onClick={() => setShowAddInteractionModal(true)}>
                Add Interaction
              </LoadingButton>
              <LoadingButton
                className="btn btn-secondary text-error hover:bg-error-container"
                loading={deleteOpportunity.isPending}
                loadingLabel="Deleting..."
                icon="delete"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${data.company.name} / ${data.roleTitle}? This also deletes its interactions.`
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
      </div>

      {focusedInteraction ? (
        <div className="mt-8">
          <FocusedInteractionCard
            interaction={focusedInteraction}
            opportunitySlug={opportunitySlug}
            opportunityCompanyName={data.company.name}
            onOpen={() => setSelectedInteractionSlug(focusedInteraction.slug)}
          />
        </div>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Timeline
            interactions={displayedInteractions}
            selectedInteractionSlug={selectedInteractionSlug}
            onSelectInteraction={setSelectedInteractionSlug}
            onAddInteraction={() => setShowAddInteractionModal(true)}
            onDeleteInteraction={(interactionSlug) => {
              if (window.confirm("Delete this interaction?")) {
                deleteInteraction.mutate(interactionSlug);
              }
            }}
            isDeletingInteraction={(interactionSlug) =>
              deleteInteraction.isPending && deleteInteraction.variables === interactionSlug
            }
          />
          <div id="contacts-section">
            <ContactsList opportunitySlug={opportunitySlug} companyName={data.company.name} />
          </div>
          <InterviewPreparation opportunity={data} />
        </div>
        <div className="space-y-8">
          <CompanyDetailsModern opportunity={data} />
        </div>
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={data ? { ...data, interactions: displayedInteractions } : null}
        onClose={() => setSelectedInteractionSlug(null)}
        onSelectInteraction={setSelectedInteractionSlug}
        onOperationStart={() => setIsInteractionOperationPending(true)}
        onOperationEnd={() => setIsInteractionOperationPending(false)}
      />

      <AddInteractionModal
        isOpen={showAddInteractionModal}
        onClose={() => setShowAddInteractionModal(false)}
        opportunitySlug={opportunitySlug}
        companyName={data.company.name}
        roleTitle={data.roleTitle}
        onSaved={() => {
          setIsInteractionOperationPending(true);
          refresh();
          setShowAddInteractionModal(false);
          // Wait for the query to refetch before removing loader
          setTimeout(() => setIsInteractionOperationPending(false), 1000);
        }}
      />

      {/* Loading overlay for interaction operations */}
      {isInteractionOperationPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600"></div>
              <span className="text-lg font-medium text-neutral-900">Updating interactions...</span>
            </div>
          </div>
        </div>
      )}
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
      <form className="group/title-edit flex max-w-full items-center gap-1" onSubmit={submit}>
        <input
          aria-label={ariaLabel}
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
          type="submit"
          aria-label={`Save ${ariaLabel.toLowerCase()}`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
          disabled={isSaving || !draft.trim()}
        >
          <MaterialIcon name="check" className="text-[16px]" />
        </button>
        <button
          type="button"
          aria-label={`Cancel ${ariaLabel.toLowerCase()} edit`}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-outline-variant/30 text-on-surface-variant transition-colors hover:bg-outline-variant/50"
          disabled={isSaving}
          onClick={cancel}
        >
          <MaterialIcon name="close" className="text-[16px]" />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      className="group/title-edit inline-flex max-w-full items-center gap-2 rounded-lg transition-colors hover:bg-surface-container-low/50"
      onClick={() => setIsEditing(true)}
      aria-label={`Edit ${ariaLabel.toLowerCase()}`}
      disabled={isSaving}
    >
      <span className={className}>{value}</span>
      <MaterialIcon
        name="edit"
        className="shrink-0 text-[18px] text-on-surface-variant opacity-0 transition-opacity group-hover/title-edit:opacity-100 group-focus/title-edit:opacity-100"
      />
    </button>
  );
}

function buildOpportunityInput(opportunity: Opportunity, updates: Pick<Opportunity, "roleTitle">) {
  return {
    companyName: opportunity.company.name,
    companySearchName: opportunity.company.searchName ?? null,
    roleTitle: updates.roleTitle,
    pipelineType: opportunity.pipelineType,
    status: opportunity.status,
    priority: opportunity.priority,
    referrerOrConnection: opportunity.referrerOrConnection ?? null,
    source: opportunity.source ?? null,
    jobUrl: opportunity.jobUrl ?? null,
    linkedinUrl: opportunity.linkedinUrl ?? null,
    linkedinJobId: opportunity.linkedinJobId ?? null,
    sourceUrl: opportunity.sourceUrl ?? null,
    nextStep: opportunity.nextStep ?? null,
    notes: opportunity.notes ?? null,
    employeesRangeId: opportunity.company.employeesRange?.id ?? null,
    companyStageId: opportunity.company.companyStage?.id ?? null,
    workModelId: opportunity.workModel?.id ?? null,
    location: opportunity.company.location ?? null,
    funding: opportunity.company.funding ?? null,
    companyDescription: opportunity.company.description ?? null,
    productDescription: opportunity.company.productDescription ?? null,
    customersTraction: opportunity.company.customersTraction ?? null,
    techStack: opportunity.company.techStack ?? null,
    backendFrontendSplit: opportunity.company.backendFrontendSplit ?? null,
    compensationNotes: opportunity.compensationNotes ?? null,
    domainIds: opportunity.domains.map((item) => item.domain.id),
  };
}

function FocusedInteractionCard({
  interaction,
  opportunitySlug,
  opportunityCompanyName,
  onOpen,
}: {
  interaction: Interaction;
  opportunitySlug: string;
  opportunityCompanyName: string;
  onOpen: () => void;
}) {
  const badge = getInteractionBadgeMeta(interaction);
  const duration = formatDurationBetween(interaction.date, interaction.endDate);

  // Fetch contacts to get job titles and research status
  const { data: contacts = [] } = useQuery({
    queryKey: ["opportunity-contacts", opportunitySlug],
    queryFn: () => api.getOpportunityContacts(opportunitySlug),
  });

  // Parse participant names and filter out blank entries
  const personNames = interaction.personName
    ? interaction.personName
        .split(/\s+and\s+|,\s*/)
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
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
    const caseInsensitiveMatch = (contacts as Person[]).find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (caseInsensitiveMatch) return caseInsensitiveMatch;

    // 3. Full name contains contact name (e.g., "Rotem Zikorel" contains "Rotem")
    // Guard against blank names to prevent matching empty strings
    if (name.length > 0) {
      const containsMatch = (contacts as Person[]).find((c) => {
        const nameLower = name.toLowerCase();
        const contactNameLower = c.name.toLowerCase();
        return nameLower.includes(contactNameLower) || contactNameLower.includes(nameLower);
      });
      if (containsMatch) return containsMatch;
    }

    return undefined;
  });

  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-primary">
            <MaterialIcon name="calendar_month" className="text-[22px]" />
          </div>
          <div className="min-w-0">
            <p className="font-label-sm text-label-sm uppercase tracking-widest text-primary">Interview focus</p>
            <h2 className="mt-1 font-title-xl text-title-xl font-bold text-on-background">
              {interaction.stage || interaction.type}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
              <span>{formatDateTimeRange(interaction.date, interaction.endDate)}</span>
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
            <a className="btn btn-primary" href={interaction.meetingLink} target="_blank" rel="noreferrer">
              <MaterialIcon name="videocam" />
              Join meeting
            </a>
          ) : null}
          <Button variant="secondary" onClick={onOpen}>
            <MaterialIcon name="open_in_full" />
            Open details
          </Button>
        </div>
      </div>
      {personNames.length > 0 ? (
        <div className="mt-5">
          <ParticipantsCard
            personNames={personNames}
            personRecords={personRecords}
            opportunitySlug={opportunitySlug}
            opportunityCompanyName={opportunityCompanyName}
          />
        </div>
      ) : null}
    </section>
  );
}
