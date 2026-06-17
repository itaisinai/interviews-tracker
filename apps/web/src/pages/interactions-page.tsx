import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InteractionsDrawer } from "../components/interactions-drawer";
import {
  DesktopInteractionsFlow,
  MobileInteractionsFlow,
  buildInteractionCalendarEvents,
  buildOpportunityGroups,
  calculatePercent,
  countFollowUps,
  filterOpportunityGroup,
  type InteractionFilter,
} from "../components/interactions-flow";
import { api } from "../lib/api";
import { buildSelectedOpportunityForInteraction } from "./interactions-page-selection";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import {
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";

export function InteractionsPage() {
  const [filter, setFilter] = useState<InteractionFilter>("upcoming");
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailOpportunityId, setGmailOpportunityId] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const queryClient = useQueryClient();

  const interactionsQuery = useQuery({
    queryKey: ["interactions"],
    queryFn: api.interactions,
  });
  const opportunitiesQuery = useQuery({
    queryKey: ["opportunities", "gmail-import"],
    queryFn: () => api.opportunities("?summary=1"),
    staleTime: 30_000,
  });

  const interactions = interactionsQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];
  const displayInteractions = useMemo(
    () => promoteOverdueInteractionsForRead(interactions),
    [interactions],
  );
  const opportunityGroups = useMemo(
    () => buildOpportunityGroups(displayInteractions),
    [displayInteractions],
  );
  const visibleOpportunityGroups = useMemo(
    () =>
      opportunityGroups.filter((group) =>
        filterOpportunityGroup(group, filter),
      ),
    [filter, opportunityGroups],
  );
  const calendarEvents = useMemo(
    () => buildInteractionCalendarEvents(displayInteractions),
    [displayInteractions],
  );
  const gmailOpportunity = useMemo(
    () => opportunities.find((item) => item.id === gmailOpportunityId) ?? null,
    [gmailOpportunityId, opportunities],
  );
  const selectedInteraction = useMemo(
    () =>
      displayInteractions.find((item) => item.id === selectedInteractionId) ??
      null,
    [displayInteractions, selectedInteractionId],
  );
  const selectedOpportunity = useMemo(
    () =>
      selectedInteraction
        ? buildSelectedOpportunityForInteraction(
            selectedInteraction,
            displayInteractions,
            opportunities,
          )
        : null,
    [displayInteractions, opportunities, selectedInteraction],
  );
  const followUpCount = countFollowUps(displayInteractions);
  const followUpPercent = calculatePercent(
    followUpCount,
    displayInteractions.length,
  );

  const deleteInteraction = useMutation({
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  useEffect(() => {
    if (
      selectedInteractionId &&
      !displayInteractions.some((item) => item.id === selectedInteractionId)
    ) {
      setSelectedInteractionId(null);
    }
  }, [displayInteractions, selectedInteractionId]);

  function closeInteractionDrawer() {
    setSelectedInteractionId(null);
  }

  function openGmailImport() {
    setGmailOpportunityId(gmailOpportunityId || opportunities[0]?.id || "");
    setShowGmailImport(true);
  }

  function closeGmailImport() {
    setShowGmailImport(false);
  }

  if (interactionsQuery.isLoading || opportunitiesQuery.isLoading) {
    return (
      <PageLoadingState
        title="Interactions"
        description="Loading interactions and available opportunities."
      />
    );
  }

  if (interactionsQuery.isError) {
    return (
      <PageErrorState
        title="Interactions"
        description={
          interactionsQuery.error instanceof Error
            ? interactionsQuery.error.message
            : "Unable to load interactions."
        }
        onRetry={() => void interactionsQuery.refetch()}
      />
    );
  }

  if (opportunitiesQuery.isError) {
    return (
      <PageErrorState
        title="Interactions"
        description={
          opportunitiesQuery.error instanceof Error
            ? opportunitiesQuery.error.message
            : "Unable to load opportunities for the form."
        }
        onRetry={() => void opportunitiesQuery.refetch()}
      />
    );
  }

  const sharedFlowProps = {
    filter,
    showGmailImport,
    isFetching: interactionsQuery.isFetching,
    interactions: displayInteractions,
    visibleGroups: visibleOpportunityGroups,
    opportunities,
    gmailOpportunityId,
    gmailOpportunity,
    selectedInteractionId,
    followUpPercent,
    onFilterChange: setFilter,
    onSelectGmailOpportunity: setGmailOpportunityId,
    onGmailSaved: closeGmailImport,
    onSelectInteraction: setSelectedInteractionId,
    onDeleteInteraction: (interactionId: string) =>
      deleteInteraction.mutate(interactionId),
    isDeletingInteraction: (interactionId: string) =>
      deleteInteraction.isPending &&
      deleteInteraction.variables === interactionId,
  };

  return (
    <>
      <MobileInteractionsFlow
        {...sharedFlowProps}
        onToggleGmailImport={
          showGmailImport ? closeGmailImport : openGmailImport
        }
      />
      <DesktopInteractionsFlow
        {...sharedFlowProps}
        calendarEvents={calendarEvents}
        followUpCount={followUpCount}
        onOpenGmailImport={openGmailImport}
        onCloseGmailImport={closeGmailImport}
      />
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={selectedOpportunity}
        onClose={closeInteractionDrawer}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}
