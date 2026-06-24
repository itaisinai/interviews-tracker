import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  Interaction,
  InteractionDraft,
  Opportunity,
} from "../../lib/types";
import { api } from "../../lib/api";
import { normalizeInteractionType } from "../../lib/enum-labels";
import {
  getInteractionTimelineBadgeMeta,
  promoteOverdueInteractionsForRead,
} from "../../lib/interaction-status";
import { InteractionDrawerHeader } from "./interaction-drawer-header";
import { InteractionSummaryPanel } from "./interaction-summary-panel";
import { InteractionTimelinePanel } from "./interaction-timeline-panel";
import { interactionToDraft } from "./interaction-draft";
import { useNavigate } from "react-router-dom";

type InteractionsDrawerProps = {
  selectedInteraction: Interaction | null;
  selectedOpportunity: Opportunity | null;
  onClose: () => void;
  onSelectInteraction?: (interactionId: string) => void;
};


export function InteractionsDrawer({
  selectedInteraction,
  selectedOpportunity,
  onClose,
  onSelectInteraction,
}: InteractionsDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<InteractionDraft | null>(null);
  const [mountedInteraction, setMountedInteraction] =
    useState<Interaction | null>(selectedInteraction);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const openFrameRef = useRef<number | null>(null);

  const opportunityId = mountedInteraction?.jobOpportunityId ?? "";

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
    setIsEditing(false);
    setDraft(mountedInteraction ? interactionToDraft(mountedInteraction) : null);
  }, [mountedInteraction?.id]);

  const opportunity =
    selectedOpportunity ??
    mountedInteraction?.jobOpportunity ??
    null;

  const timeline = useMemo(
    () =>
      promoteOverdueInteractionsForRead(opportunity?.interactions ?? []),
    [opportunity?.interactions],
  );

  const selectedTimelineInteraction = useMemo(() => {
    // Always prefer mountedInteraction for latest data (gets updated on save)
    // Only use timeline for badge metadata
    return mountedInteraction;
  }, [mountedInteraction]);

  const headerBadge = selectedTimelineInteraction
    ? getInteractionTimelineBadgeMeta(selectedTimelineInteraction, timeline)
    : null;

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

      return api.updateInteraction(selectedTimelineInteraction.slug || selectedTimelineInteraction.id, draft);
    },
    onSuccess: (savedInteraction) => {
      // Update the opportunity cache with saved interaction
      queryClient.setQueryData(
        ["opportunity", opportunityId],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            interactions: old.interactions.map((int: any) =>
              int.id === savedInteraction.id ? savedInteraction : int
            )
          };
        }
      );

      // Update local drawer state so it shows fresh data immediately
      setMountedInteraction(savedInteraction);

      // Invalidate other queries
      refreshQueries();

      setIsEditing(false);
      setDraft(interactionToDraft(savedInteraction));
    },
  });

  if (!mountedInteraction) {
    return null;
  }

  const displayInteraction = selectedTimelineInteraction ?? mountedInteraction;

  const handleOpenFullscreen = () => {
    if (opportunity) {
      navigate(`/opportunities/${opportunity.slug ?? opportunity.id}?interaction=${displayInteraction.id}`);
      onClose();
    }
  };

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
        <InteractionDrawerHeader
          opportunity={opportunity}
          interaction={displayInteraction}
          onClose={onClose}
          onOpenFullscreen={handleOpenFullscreen}
        />

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-4">
            <InteractionSummaryPanel
              interaction={displayInteraction}
              headerBadge={headerBadge}
              isEditing={isEditing}
              draft={draft}
              onToggleEditing={(aiSuggestion?: any) => {
                // If AI suggestion provided, use it to create draft
                if (aiSuggestion) {
                  console.log('[DRAWER] Creating draft from AI suggestion:', aiSuggestion.notes?.slice(0, 100));
                  setDraft({
                    date: aiSuggestion.date || displayInteraction.date,
                    endDate: aiSuggestion.endDate ?? null,
                    type: normalizeInteractionType(aiSuggestion.type || displayInteraction.type),
                    stage: aiSuggestion.stage ?? null,
                    status: aiSuggestion.status || displayInteraction.status,
                    personName: aiSuggestion.personName ?? null,
                    personRole: aiSuggestion.personRole ?? null,
                    agenda: aiSuggestion.agenda ?? null,
                    meetingLink: aiSuggestion.meetingLink ?? null,
                    gmailMessageId: displayInteraction.gmailMessageId ?? null,
                    notes: aiSuggestion.notes ?? null,
                    outcome: aiSuggestion.outcome ?? null,
                    followUp: aiSuggestion.followUp ?? null,
                  });
                } else {
                  // Normal edit - use current interaction data
                  setDraft(interactionToDraft(displayInteraction));
                }
                setIsEditing(true);
              }}
              onCancelEditing={() => {
                setIsEditing(false);
                setDraft(interactionToDraft(displayInteraction));
              }}
              onDraftChange={setDraft}
              onSave={() => void updateInteraction.mutate()}
              isSaving={updateInteraction.isPending}
              onDelete={() => {
                deleteInteraction.mutate(displayInteraction.slug || displayInteraction.id);
              }}
              isDeleting={
                deleteInteraction.isPending &&
                deleteInteraction.variables === displayInteraction.id
              }
              opportunityCompanyName={opportunity?.companyName}
            />

            <InteractionTimelinePanel
              companyName={opportunity?.companyName ?? "Timeline"}
              interactions={timeline}
              selectedInteractionId={displayInteraction.id}
              onSelectInteraction={onSelectInteraction}
            />
          </div>
        </div>
      </aside>
    </div>
  );
}
