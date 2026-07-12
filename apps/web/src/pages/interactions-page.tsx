import { useEffect, useMemo, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { InteractionsDrawer } from "../components/interactions-drawer";
import {
  buildInteractionCalendarEvents,
  buildOpportunityGroups,
  calculatePercent,
  countFollowUps,
  DesktopInteractionsFlow,
  filterOpportunityGroup,
  type InteractionFilter,
  MobileInteractionsFlow,
} from "../components/interactions-flow";
import { api } from "../lib/api";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";

import { buildSelectedOpportunityForInteraction } from "./interactions-page-selection";

export function InteractionsPage() {
  const [filter, setFilter] = useState<InteractionFilter>("upcoming");
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailOpportunitySlug, setGmailOpportunitySlug] = useState("");
  const [selectedInteractionSlug, setSelectedInteractionSlug] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const interactionsQuery = useQuery({
    queryKey: ["interactions"],
    queryFn: api.interactions,
  });

  const interactions = interactionsQuery.data ?? [];

  // Derive opportunities from interactions (each interaction has jobOpportunity nested)
  const opportunities = useMemo(() => {
    const uniqueOpportunities = new Map();
    interactions.forEach((interaction) => {
      if (interaction.jobOpportunity) {
        uniqueOpportunities.set(interaction.jobOpportunity.slug, interaction.jobOpportunity);
      }
    });
    return Array.from(uniqueOpportunities.values());
  }, [interactions]);
  const displayInteractions = useMemo(() => promoteOverdueInteractionsForRead(interactions), [interactions]);
  const opportunityGroups = useMemo(() => buildOpportunityGroups(displayInteractions), [displayInteractions]);
  const visibleOpportunityGroups = useMemo(
    () => opportunityGroups.filter((group) => filterOpportunityGroup(group, filter)),
    [filter, opportunityGroups]
  );
  const calendarEvents = useMemo(() => buildInteractionCalendarEvents(displayInteractions), [displayInteractions]);
  const gmailOpportunity = useMemo(
    () => opportunities.find((item) => item.slug === gmailOpportunitySlug) ?? null,
    [gmailOpportunitySlug, opportunities]
  );
  const selectedInteraction = useMemo(
    () => displayInteractions.find((item) => item.slug === selectedInteractionSlug) ?? null,
    [displayInteractions, selectedInteractionSlug]
  );
  const selectedOpportunity = useMemo(
    () =>
      selectedInteraction
        ? buildSelectedOpportunityForInteraction(selectedInteraction, displayInteractions, opportunities)
        : null,
    [displayInteractions, opportunities, selectedInteraction]
  );
  const followUpCount = countFollowUps(displayInteractions);
  const followUpPercent = calculatePercent(followUpCount, displayInteractions.length);

  const deleteInteraction = useMutation({
    mutationFn: (interactionSlug: string) => api.deleteInteraction(interactionSlug),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  useEffect(() => {
    if (selectedInteractionSlug && !displayInteractions.some((item) => item.slug === selectedInteractionSlug)) {
      setSelectedInteractionSlug(null);
    }
  }, [displayInteractions, selectedInteractionSlug]);

  function closeInteractionDrawer() {
    setSelectedInteractionSlug(null);
  }

  function openGmailImport() {
    setGmailOpportunitySlug(gmailOpportunitySlug || opportunities[0]?.slug || "");
    setShowGmailImport(true);
  }

  function closeGmailImport() {
    setShowGmailImport(false);
  }

  if (interactionsQuery.isLoading) {
    return <PageLoadingState title="Interactions" description="Loading interactions and available opportunities." />;
  }

  if (interactionsQuery.isError) {
    return (
      <PageErrorState
        title="Interactions"
        description={
          interactionsQuery.error instanceof Error ? interactionsQuery.error.message : "Unable to load interactions."
        }
        onRetry={() => void interactionsQuery.refetch()}
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
    gmailOpportunitySlug,
    gmailOpportunity,
    selectedInteractionSlug,
    followUpPercent,
    onFilterChange: setFilter,
    onSelectGmailOpportunity: setGmailOpportunitySlug,
    onGmailSaved: closeGmailImport,
    onSelectInteraction: setSelectedInteractionSlug,
    onDeleteInteraction: (interactionSlug: string) => deleteInteraction.mutate(interactionSlug),
    isDeletingInteraction: (interactionSlug: string) =>
      deleteInteraction.isPending && deleteInteraction.variables === interactionSlug,
  };

  return (
    <>
      <MobileInteractionsFlow
        {...sharedFlowProps}
        onToggleGmailImport={showGmailImport ? closeGmailImport : openGmailImport}
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
        onSelectInteraction={setSelectedInteractionSlug}
      />
    </>
  );
}
