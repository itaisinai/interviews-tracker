import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { InteractionDraft } from "../../lib/types";
import { InteractionDraftFields } from "../interactions-drawer/interaction-draft-fields";
import { LoadingButton } from "@interviews-tracker/design-system";

export type ManualInteractionFormProps = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved: () => void;
  onCancel: () => void;
};

export function ManualInteractionForm({
  opportunityId,
  companyName,
  roleTitle,
  onSaved,
  onCancel,
}: ManualInteractionFormProps) {
  const [draft, setDraft] = useState<InteractionDraft>({
    date: new Date().toISOString(),
    endDate: null,
    type: "Interview",
    stage: null,
    status: "SCHEDULED",
    personName: null,
    personRole: null,
    agenda: null,
    meetingLink: null,
    gmailMessageId: null,
    notes: null,
    outcome: null,
    followUp: null,
  });

  const createInteraction = useMutation({
    mutationFn: () => api.createInteraction(opportunityId, draft),
    onSuccess: onSaved,
  });

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Adding to
        </div>
        <div className="font-medium text-neutral-900">{companyName}</div>
        <div className="text-sm text-neutral-600">{roleTitle}</div>
      </div>

      <InteractionDraftFields draft={draft} setDraft={setDraft as any} />

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <LoadingButton
          loading={createInteraction.isPending}
          loadingLabel="Saving..."
          onClick={() => createInteraction.mutate()}
          className="btn btn-primary"
        >
          Save Interaction
        </LoadingButton>
        <button onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  );
}
