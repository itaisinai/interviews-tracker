import { ProcessStateCard } from "@interviews-tracker/design-system";
import type { Interaction } from "../../lib/types";
import { GmailReviewPanel } from "./gmail-review-panel";
import { GmailWorkspace } from "./gmail-workspace";
import { useGmailInteractionPanel } from "./use-gmail-interaction-panel";

type GmailInteractionPanelProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
  attachToInteractionId?: string | null;
};

export function GmailInteractionPanel(props: GmailInteractionPanelProps) {
  const panel = useGmailInteractionPanel(props);

  if (panel.statusLoading) {
    return (
      <section className="panel border border-outline-variant p-6">
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

  return (
    <section className="panel border border-outline-variant p-6">
      {panel.isReviewingDraft && panel.draft && panel.selectedEmail ? (
        <GmailReviewPanel
          draft={panel.draft}
          selectedEmail={panel.selectedEmail}
          analysis={panel.analysis}
          attachTargetInteraction={panel.attachTargetInteraction}
          attachTargetId={panel.attachTargetId}
          isAttachMode={panel.isAttachMode}
          hasParsedInteractionChanges={panel.hasParsedInteractionChanges}
          changedInteractionFields={panel.changedInteractionFields}
          changedFieldLabels={panel.changedFieldLabels}
          saveMessage={panel.saveMessage}
          saveError={panel.saveError}
          saveInteractionPending={panel.saveInteractionPending}
          isAttaching={panel.isAttaching}
          opportunityInteractions={panel.opportunityInteractions}
          onSelectAnotherEmail={panel.onSelectAnotherEmail}
          onSaveInteraction={panel.onSaveInteraction}
          onAttachToExistingInteraction={panel.attachToExistingInteraction}
          onAttachTargetIdChange={panel.onAttachTargetIdChange}
          onDraftChange={panel.onDraftChange}
        />
      ) : (
        <GmailWorkspace
          companyName={props.companyName}
          roleTitle={props.roleTitle}
          connected={panel.connected}
          configured={panel.configured}
          shouldReconnect={panel.shouldReconnect}
          statusFetching={panel.statusFetching}
          flowState={panel.flowState}
          currentLabel={panel.currentMeta.label}
          currentTone={panel.currentMeta.tone}
          message={panel.message}
          progress={panel.progress}
          error={panel.error}
          needsReconnect={panel.needsReconnect}
          searchResults={panel.searchResults}
          selectedCandidateId={panel.selectedCandidateId}
          isParsingCandidateId={panel.isParsingCandidateId}
          actionDisabled={panel.actionDisabled}
          clearingEmailId={panel.clearingEmailId}
          removedEmails={panel.removedEmails}
          pickedEmails={panel.pickedEmails}
          removedEmailsExpanded={panel.removedEmailsExpanded}
          pendingPickedEmailIds={panel.pendingPickedEmailIds}
          gmailMessageStatesFetching={panel.gmailMessageStatesFetching}
          onConnect={panel.connectGmail}
          onSearch={panel.searchEmails}
          onRetry={panel.retryLastAction}
          onParseEmail={panel.parseEmail}
          onClearEmail={panel.clearEmail}
          onRestoreEmail={panel.restoreEmail}
          onUnpickEmail={panel.unpickEmail}
          onRemovedEmailsExpandedChange={panel.onRemovedEmailsExpandedChange}
        />
      )}
    </section>
  );
}
