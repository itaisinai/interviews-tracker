import { FilePenLine, Mail } from "lucide-react";

export type InteractionInputMode = "chooser" | "gmail" | "text" | null;

type InteractionInputChooserProps = {
  onSelectMode: (mode: InteractionInputMode) => void;
};

export function InteractionInputChooser({ onSelectMode }: InteractionInputChooserProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <button
        className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
        onClick={() => onSelectMode("gmail")}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-on-background">Import from Gmail</p>
            <p className="text-body-md text-on-surface-variant">
              Search related emails, parse one, and review before saving.
            </p>
          </div>
        </div>
      </button>
      <button
        className="rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
        onClick={() => onSelectMode("text")}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FilePenLine className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-on-background">Paste free text</p>
            <p className="text-body-md text-on-surface-variant">
              Parse recruiter messages, notes, or calendar text into a draft.
            </p>
          </div>
        </div>
      </button>
    </div>
  );
}
