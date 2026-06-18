import { ProcessStateCard, LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";
import type { Interaction } from "../../lib/types";
import { GmailAiSearch } from "./gmail-ai-search";
import { GmailChangesReview } from "./gmail-changes-review";
import { GmailSuccessState } from "./gmail-success-state";
import { GmailReviewPanel } from "./gmail-review-panel";
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
      <section className="rounded-xl border border-neutral-200 bg-white p-8">
        <div className="max-w-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <MaterialIcon name="mail" className="text-[24px]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-neutral-900 mb-1">
                Connect Gmail
              </h3>
              <p className="text-sm text-neutral-600">
                Import interactions directly from your Gmail calendar invites and emails.
              </p>
            </div>
          </div>

          {!panel.configured ? (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
              Gmail OAuth is not configured on this environment.
            </div>
          ) : (
            <LoadingButton
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              loading={panel.flowState === "connecting_gmail"}
              loadingLabel="Connecting..."
              onClick={panel.connectGmail}
            >
              <MaterialIcon name="link" className="text-[16px]" />
              {panel.shouldReconnect ? "Reconnect Gmail" : "Connect Gmail"}
            </LoadingButton>
          )}

          {panel.error && panel.flowState === "failed" && (
            <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50">
              <p className="font-medium text-sm text-red-900 mb-1">Connection failed</p>
              <p className="text-sm text-red-800">{panel.error}</p>
              {panel.needsReconnect && (
                <LoadingButton
                  className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                  loading={false}
                  onClick={panel.connectGmail}
                >
                  Reconnect Gmail
                </LoadingButton>
              )}
            </div>
          )}
        </div>
      </section>
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
    const handleAccept = async () => {
      if (panel.isAttachMode) {
        await panel.attachToExistingInteraction();
      } else {
        await panel.onSaveInteraction();
      }

      // Show success state
      setShowSuccess(true);
    };

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
          saveInteractionPending={panel.saveInteractionPending}
          onAcceptChanges={handleAccept}
          onEditManually={() => setShowManualEdit(true)}
          onCancel={() => {
            panel.onSelectAnotherEmail();
            setShowManualEdit(false);
          }}
        />
      </section>
    );
  }

  // Manual edit mode (fallback to old UI)
  if (showManualEdit && panel.draft && panel.selectedEmail) {
    return (
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
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
          onSelectAnotherEmail={() => {
            panel.onSelectAnotherEmail();
            setShowManualEdit(false);
          }}
          onSaveInteraction={async () => {
            await panel.onSaveInteraction();
            setShowSuccess(true);
            setShowManualEdit(false);
          }}
          onAttachToExistingInteraction={async () => {
            await panel.attachToExistingInteraction();
            setShowSuccess(true);
            setShowManualEdit(false);
          }}
          onAttachTargetIdChange={panel.onAttachTargetIdChange}
          onDraftChange={panel.onDraftChange}
        />
      </section>
    );
  }

  // Idle state - show CTA
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-8">
      <div className="max-w-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MaterialIcon name="auto_awesome" className="text-[24px]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              AI-Powered Gmail Import
            </h3>
            <p className="text-sm text-neutral-600 mb-4">
              Let AI find and extract interaction details from your recent Gmail threads for {props.companyName}.
            </p>
            <LoadingButton
              className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
              loading={panel.flowState === "searching_emails"}
              loadingLabel="Searching..."
              onClick={panel.searchEmails}
            >
              <MaterialIcon name="search" className="text-[16px]" />
              Add interaction from Gmail
            </LoadingButton>
          </div>
        </div>

        {panel.error && panel.flowState === "failed" && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="font-medium text-sm text-red-900 mb-1">Search failed</p>
            <p className="text-sm text-red-800">{panel.error}</p>
            <div className="mt-3 flex items-center gap-2">
              {panel.needsReconnect ? (
                <LoadingButton
                  className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                  loading={false}
                  onClick={panel.connectGmail}
                >
                  Reconnect Gmail
                </LoadingButton>
              ) : (
                <LoadingButton
                  className="px-4 py-2 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors"
                  loading={false}
                  onClick={panel.retryLastAction}
                >
                  Retry
                </LoadingButton>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
