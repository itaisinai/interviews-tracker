import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InteractionsDrawer } from "../components/interactions-drawer";
import { PageIntro } from "../components/app-shell";
import { Timeline } from "../components/timeline";
import { ContactsList } from "../components/contacts/contacts-list";
import { InterviewPreparation } from "../components/interview-preparation";
import { CompanyDetailsModern } from "../components/opportunity-detail/company-details-modern";
import { AddInteractionModal } from "../components/add-interaction-modal";
import { api } from "../lib/api";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import { InlineLoadingState, LoadingButton, MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";
import { labelForPipelineType } from "../lib/enum-labels";
import { Badge } from "../components/badge";

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

  const opportunityId = data?.slug ?? data?.id ?? slugOrId;
  const canonicalSlug = data?.slug ?? null;
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["opportunity", slugOrId] });
  const deleteOpportunity = useMutation({
    mutationFn: () => api.deleteOpportunity(opportunityId),
    onSuccess: () => navigate("/opportunities"),
  });
  const deleteInteraction = useMutation({
    mutationFn: (interactionId: string) => api.deleteInteraction(interactionId),
    onSuccess: refresh,
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

      <div className="mt-8">
        <InterviewPreparation opportunity={data} />
      </div>

      <div id="contacts-section" className="mt-8">
        <ContactsList opportunityId={opportunityId} companyName={data.companyName} />
      </div>

      <div className="mt-8">
        <CompanyDetailsModern opportunity={data} />
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
        selectedOpportunity={data ? { ...data, interactions: displayedInteractions } : null}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />

      <AddInteractionModal
        isOpen={showAddInteractionModal}
        onClose={() => setShowAddInteractionModal(false)}
        opportunityId={opportunityId}
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
