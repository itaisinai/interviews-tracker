import { ProcessStateCard } from "@interviews-tracker/design-system";
import type { Interaction } from "../../lib/types";
import { GmailAiSearch } from "./gmail-ai-search";
import { GmailChangesReview } from "./gmail-changes-review";
import { GmailCreateReview } from "./gmail-create-review";
import { GmailSuccessState } from "./gmail-success-state";
import { GmailReviewPanel } from "./gmail-review-panel";
import { GmailConnectionPrompt } from "./gmail-connection-prompt";
import { useGmailInteractionPanel } from "./use-gmail-interaction-panel";
import { useState } from "react";

type GmailInteractionPanelProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
  attachToInteractionId?: string | null;
};

export function GmailInteractionPanel(props: GmailInteractionPanelProps) {
  const panel = useGmailInteractionPanel(props);
  const [showManualEdit, setShowManualEdit] = useState(false);
  const [savedInteraction, setSavedInteraction] = useState<Interaction | undefined>(undefined);
  const [showSuccess, setShowSuccess] = useState(false);

  // Loading state
  if (panel.statusLoading) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <ProcessStateCard
          title="Gmail"
          message="Checking Gmail connection status."
          description="This verifies whether the separate Gmail OAuth connection is already available."
          tone="busy"
          progress={15}
        />
      </section>
    );
  }

  // Not connected - show connection UI
  if (!panel.connected) {
    return (
      <GmailConnectionPrompt
        configured={panel.configured}
        flowState={panel.flowState}
        shouldReconnect={panel.shouldReconnect}
        error={panel.error}
        needsReconnect={panel.needsReconnect}
        onConnect={panel.connectGmail}
      />
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-8">
        <GmailSuccessState
          interaction={savedInteraction}
          onViewInteraction={savedInteraction ? () => props.onSaved?.(savedInteraction) : undefined}
          onImportAnother={() => {
            setShowSuccess(false);
            setSavedInteraction(undefined);
            panel.onSelectAnotherEmail();
          }}
        />
      </section>
    );
  }

  // AI Search in progress
  if (panel.flowState === "searching_emails" || panel.flowState === "fetching_email" || panel.flowState === "parsing_email") {
    const stage =
      panel.flowState === "searching_emails" ? "searching" :
      panel.flowState === "fetching_email" ? "matching" :
      "parsing";

    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-8">
        <GmailAiSearch
          companyName={props.companyName}
          stage={stage}
          progress={panel.progress}
        />
      </section>
    );
  }

  // Review changes (modern UI)
  if (panel.isReviewingDraft && panel.draft && panel.selectedEmail && !showManualEdit) {
    const handleAccept = async (updatedDraft?: typeof panel.draft) => {
      if (panel.isAttachMode) {
        // For attach mode, update state first
        if (updatedDraft) {
          panel.onDraftChange(updatedDraft);
        }
        await panel.attachToExistingInteraction();
      } else {
        // For new interactions, pass updated draft directly to save
        await panel.onSaveInteraction(updatedDraft ?? panel.draft);
      }

      // Show success state
      setShowSuccess(true);
    };

    // For new interactions (not attach mode), show clean editable review
    if (!panel.isAttachMode) {
      return (
        <section className="rounded-xl border border-neutral-200 bg-white p-8">
          <GmailCreateReview
            draft={panel.draft}
            selectedEmail={panel.selectedEmail}
            analysis={panel.analysis}
            isAttaching={panel.isAttaching}
            saveInteractionPending={false}
            onAcceptChanges={handleAccept}
            onEditManually={() => setShowManualEdit(true)}
            onCancel={panel.onSelectAnotherEmail}
          />
        </section>
      );
    }

    // For attach mode, show diff view
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-8">
        <GmailChangesReview
          draft={panel.draft}
          selectedEmail={panel.selectedEmail}
          analysis={panel.analysis}
          attachTargetInteraction={panel.attachTargetInteraction}
          changedInteractionFields={panel.changedInteractionFields}
          isAttachMode={panel.isAttachMode}
          hasParsedInteractionChanges={panel.hasParsedInteractionChanges}
          isAttaching={panel.isAttaching}
          saveInteractionPending={false}
          onAcceptChanges={() => handleAccept()}
          onEditManually={() => setShowManualEdit(true)}
          onCancel={panel.onSelectAnotherEmail}
        />
      </section>
    );
  }

  // Review panel with manual edit
  if (showManualEdit && panel.draft && panel.selectedEmail) {
    const handleSave = async () => {
      if (panel.isAttachMode) {
        await panel.attachToExistingInteraction();
      } else {
        await panel.onSaveInteraction();
      }
      setShowSuccess(true);
    };

    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-8">
        <GmailReviewPanel
          draft={panel.draft}
          selectedEmail={panel.selectedEmail}
          analysis={panel.analysis}
          isAttachMode={panel.isAttachMode}
          attachTargetInteraction={panel.attachTargetInteraction}
          attachTargetId={panel.attachTargetId}
          opportunityInteractions={panel.opportunityInteractions}
          changedInteractionFields={panel.changedInteractionFields}
          hasParsedInteractionChanges={panel.hasParsedInteractionChanges}
          changedFieldLabels={panel.changedFieldLabels}
          saveMessage={null}
          saveError={panel.saveError}
          saveInteractionPending={false}
          isAttaching={panel.isAttaching}
          onDraftChange={panel.onDraftChange}
          onAttachTargetIdChange={panel.onAttachTargetIdChange}
          onSelectAnotherEmail={panel.onSelectAnotherEmail}
          onSaveInteraction={handleSave}
          onAttachToExistingInteraction={handleSave}
        />
      </section>
    );
  }

  return null;
}
