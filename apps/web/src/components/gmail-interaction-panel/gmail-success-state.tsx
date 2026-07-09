import { CheckCircle2, ExternalLink, Search } from "lucide-react";

import type { Interaction } from "../../lib/types";

type GmailSuccessStateProps = {
  interaction?: Interaction;
  onViewInteraction?: () => void;
  onImportAnother: () => void;
};

export function GmailSuccessState({ interaction, onViewInteraction, onImportAnother }: GmailSuccessStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[500px]">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Message */}
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900 mb-2">You're all set!</h2>
          <p className="text-sm text-neutral-600">
            The email has been attached and the interaction was {interaction ? "updated" : "created"} successfully.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          {onViewInteraction && (
            <button
              onClick={onViewInteraction}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Open interaction
            </button>
          )}

          <button
            onClick={onImportAnother}
            className="w-full sm:w-auto px-6 py-2.5 rounded-lg border border-neutral-200 text-neutral-700 font-medium text-sm hover:bg-neutral-50 transition-colors inline-flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Import another
          </button>
        </div>
      </div>
    </div>
  );
}
