import { useState } from "react";

import { MaterialIcon, Modal } from "@interviews-tracker/design-system";

import type { InteractionDraft } from "../../lib/types";

import { GmailImportFlow } from "./gmail-import-flow";
import { ManualInteractionForm } from "./manual-interaction-form";
import { TextParseFlow } from "./text-parse-flow";

export type AddInteractionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  onSaved: () => void;
};

type InputMode = "chooser" | "manual" | "gmail" | "text-parse" | "text-review";

export function AddInteractionModal({
  isOpen,
  onClose,
  opportunitySlug,
  companyName,
  roleTitle,
  onSaved,
}: AddInteractionModalProps) {
  const [mode, setMode] = useState<InputMode>("chooser");
  const [parsedDraft, setParsedDraft] = useState<InteractionDraft | null>(null);

  const handleClose = () => {
    setMode("chooser");
    setParsedDraft(null);
    onClose();
  };

  const handleSaved = () => {
    onSaved();
    handleClose();
  };

  const handleTextParsed = (draft: InteractionDraft) => {
    setParsedDraft(draft);
    setMode("text-review");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "chooser"
          ? "Add Interaction"
          : mode === "gmail"
            ? "Import from Gmail"
            : mode === "text-parse"
              ? "Parse from Text"
              : mode === "text-review"
                ? "Review Parsed Interaction"
                : "Add Interaction Manually"
      }
      size="lg"
    >
      <div className="p-6">
        {mode === "chooser" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Choose how you'd like to add an interaction for <span className="font-medium">{companyName}</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setMode("gmail")}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MaterialIcon name="mail" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Import from Gmail</h3>
                  <p className="mt-1 text-sm text-neutral-600">Search your emails and auto-extract details</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("text-parse")}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <MaterialIcon name="auto_awesome" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Parse from Text</h3>
                  <p className="mt-1 text-sm text-neutral-600">Paste a message and extract details</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode("manual")}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <MaterialIcon name="edit" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">Add Manually</h3>
                  <p className="mt-1 text-sm text-neutral-600">Enter interaction details yourself</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === "gmail" && (
          <GmailImportFlow
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            onSaved={handleSaved}
            onBack={() => setMode("chooser")}
          />
        )}

        {mode === "text-parse" && (
          <TextParseFlow
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            onParsed={handleTextParsed}
            onBack={() => setMode("chooser")}
          />
        )}

        {mode === "text-review" && parsedDraft && (
          <ManualInteractionForm
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            initialDraft={parsedDraft}
            onSaved={handleSaved}
            onCancel={() => setMode("chooser")}
          />
        )}

        {mode === "manual" && (
          <ManualInteractionForm
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            onSaved={handleSaved}
            onCancel={() => setMode("chooser")}
          />
        )}
      </div>
    </Modal>
  );
}
