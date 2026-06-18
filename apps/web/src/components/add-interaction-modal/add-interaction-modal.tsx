import { useState } from "react";
import { Modal, MaterialIcon } from "@interviews-tracker/design-system";
import { ManualInteractionForm } from "./manual-interaction-form";
import { GmailImportFlow } from "./gmail-import-flow";

export type AddInteractionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  onSaved: () => void;
};

type InputMode = "chooser" | "manual" | "gmail";

export function AddInteractionModal({
  isOpen,
  onClose,
  opportunityId,
  companyName,
  roleTitle,
  onSaved,
}: AddInteractionModalProps) {
  const [mode, setMode] = useState<InputMode>("chooser");

  const handleClose = () => {
    setMode("chooser");
    onClose();
  };

  const handleSaved = () => {
    onSaved();
    handleClose();
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
            : "Add Interaction Manually"
      }
      size="lg"
    >
      <div className="p-6">
        {mode === "chooser" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600">
              Choose how you'd like to add an interaction for{" "}
              <span className="font-medium">{companyName}</span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                onClick={() => setMode("gmail")}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MaterialIcon name="mail" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    Import from Gmail
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Search your emails and auto-extract details
                  </p>
                </div>
              </button>

              <button
                onClick={() => setMode("manual")}
                className="flex flex-col items-start gap-3 rounded-xl border-2 border-neutral-200 bg-white p-6 text-left transition-all hover:border-emerald-500 hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600">
                  <MaterialIcon name="edit" className="text-[24px]" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    Add Manually
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Enter interaction details yourself
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === "gmail" && (
          <GmailImportFlow
            opportunityId={opportunityId}
            companyName={companyName}
            roleTitle={roleTitle}
            onSaved={handleSaved}
            onBack={() => setMode("chooser")}
          />
        )}

        {mode === "manual" && (
          <ManualInteractionForm
            opportunityId={opportunityId}
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
