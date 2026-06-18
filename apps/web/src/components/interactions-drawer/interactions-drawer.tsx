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
import { useNavigate } from "react-router-dom";
import { GmailInteractionPanel } from "../gmail-interaction-panel/gmail-interaction-panel";

type InteractionsDrawerProps = {
  selectedInteraction: Interaction | null;
  selectedOpportunity: Opportunity | null;
  onClose: () => void;
  onSelectInteraction?: (interactionId: string) => void;
};


function toDraft(interaction: Interaction): InteractionDraft {
  return {
    date: interaction.date,
    endDate: interaction.endDate ?? null,
    type: normalizeInteractionType(interaction.type),
    stage: interaction.stage ?? null,
    status: interaction.status,
    personName: interaction.personName ?? null,
    personRole: interaction.personRole ?? null,
    agenda: interaction.agenda ?? null,
    meetingLink: interaction.meetingLink ?? null,
    gmailMessageId: interaction.gmailMessageId ?? null,
    notes: interaction.notes ?? null,
    outcome: interaction.outcome ?? null,
    followUp: interaction.followUp ?? null,
  };
}

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
  const [showGmailAttach, setShowGmailAttach] = useState(false);
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
    setShowGmailAttach(false);
    setDraft(mountedInteraction ? toDraft(mountedInteraction) : null);
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
    const timelineInteraction = timeline.find(
      (item) => item.id === mountedInteraction?.id,
    );
    return timelineInteraction ?? mountedInteraction ?? null;
  }, [timeline, mountedInteraction]);

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
              onToggleEditing={() => {
                setIsEditing((current) => !current);
              }}
              onCancelEditing={() => {
                setIsEditing(false);
                setDraft(toDraft(displayInteraction));
              }}
              onDraftChange={setDraft}
              onSave={() => void updateInteraction.mutate()}
              isSaving={updateInteraction.isPending}
              onDelete={() => {
                if (window.confirm("Delete this interaction?")) {
                  deleteInteraction.mutate(displayInteraction.id);
                }
              }}
              isDeleting={
                deleteInteraction.isPending &&
                deleteInteraction.variables === displayInteraction.id
              }
              onAttachEmail={() => setShowGmailAttach((current) => !current)}
            />

            {showGmailAttach && opportunity ? (
              <GmailInteractionPanel
                opportunityId={opportunity.id}
                companyName={opportunity.companyName}
                roleTitle={opportunity.roleTitle}
                attachToInteractionId={displayInteraction.id}
                onSaved={() => {
                  refreshQueries();
                  setShowGmailAttach(false);
                }}
              />
            ) : null}

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
