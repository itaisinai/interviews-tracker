import { ArrowLeft, Plus, X } from "lucide-react";

import { Button } from "@interviews-tracker/design-system";

import type { Interaction } from "../../lib/types";
import { GmailInteractionPanel } from "../gmail-interaction-panel";
import { InteractionInputChooser } from "../interaction-input-chooser";

import { InteractionTextParserPanel } from "./interaction-text-parser-panel";

type ComposerMode = "chooser" | "gmail" | "gmail-attach" | "text" | null;

type InteractionComposerPanelProps = {
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  attachToInteractionSlug: string | null;
  composer: ComposerMode;
  onComposerChange: (mode: ComposerMode) => void;
  onSaved: (savedInteraction?: Interaction | null) => void;
};

export function InteractionComposerPanel({
  opportunitySlug,
  companyName,
  roleTitle,
  attachToInteractionSlug,
  composer,
  onComposerChange,
  onSaved,
}: InteractionComposerPanelProps) {
  return (
    <section className="rounded-2xl border border-outline-variant bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Selected interaction</p>
          <h4 className="font-title-md text-title-md font-bold">
            {composer === "gmail" || composer === "gmail-attach"
              ? "Gmail import"
              : composer === "text"
                ? "Text parser"
                : "Interaction"}
          </h4>
        </div>
        {composer === null ? (
          <Button variant="secondary" onClick={() => onComposerChange("chooser")}>
            <Plus className="h-4 w-4" />
            Add interaction
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => onComposerChange(null)}>
            <X className="h-4 w-4" />
            Hide add flow
          </Button>
        )}
      </div>

      {composer === "chooser" ? (
        <div className="mt-4">
          <InteractionInputChooser
            onSelectMode={(mode) => {
              if (mode === "gmail" || mode === "text") {
                onComposerChange(mode);
              }
            }}
          />
        </div>
      ) : null}

      {composer === "gmail" || composer === "gmail-attach" ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-body-md text-on-surface-variant">
              {composer === "gmail-attach"
                ? "Search Gmail and attach the selected email to this interaction."
                : "Use the Gmail flow for the selected opportunity."}
            </p>
            <Button variant="secondary" onClick={() => onComposerChange("chooser")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <GmailInteractionPanel
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            attachToInteractionSlug={attachToInteractionSlug}
            onSaved={(savedInteraction) => {
              onSaved(savedInteraction ?? null);
              onComposerChange(null);
            }}
          />
        </div>
      ) : null}

      {composer === "text" ? (
        <div className="mt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-body-md text-on-surface-variant">
              Paste raw text and let the AI turn it into an interaction draft.
            </p>
            <Button variant="secondary" onClick={() => onComposerChange("chooser")}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <InteractionTextParserPanel
            opportunitySlug={opportunitySlug}
            companyName={companyName}
            roleTitle={roleTitle}
            onSaved={(savedInteraction) => {
              onSaved(savedInteraction ?? null);
              onComposerChange(null);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
