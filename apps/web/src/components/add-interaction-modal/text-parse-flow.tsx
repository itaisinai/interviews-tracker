import { useState } from "react";

import { useMutation } from "@tanstack/react-query";

import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import type { InteractionDraft } from "../../lib/types";

type TextParseFlowProps = {
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  onParsed: (draft: InteractionDraft) => void;
  onBack: () => void;
};

export function TextParseFlow({ opportunitySlug, companyName, roleTitle, onParsed, onBack }: TextParseFlowProps) {
  const [text, setText] = useState("");

  const parseMutation = useMutation({
    mutationFn: async (text: string) => {
      const result = await api.parseOpportunityInteractionText(opportunitySlug, { text });
      return result.interaction;
    },
    onSuccess: (draft) => {
      onParsed(draft);
    },
    onError: (error) => {
      console.error("Failed to parse text:", error);
      alert("Failed to parse text. Please try again or add manually.");
    },
  });

  const handleParse = () => {
    if (text.trim().length < 20) {
      alert("Please enter at least 20 characters to parse.");
      return;
    }
    parseMutation.mutate(text);
  };

  const canParse = text.trim().length >= 20;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <MaterialIcon name="arrow_back" className="text-[18px]" />
        Back
      </button>

      {/* Instructions */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <MaterialIcon name="info" className="text-[20px] text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900 mb-1">Paste a message about an interview or interaction</p>
            <p className="text-blue-700">
              Copy and paste an email, calendar invite, WhatsApp message, or any text containing interview details.
              We'll extract the date, time, stage, and other information automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Text input */}
      <div>
        <label htmlFor="interaction-text" className="block text-sm font-medium text-neutral-900 mb-2">
          Message Text
        </label>
        <textarea
          id="interaction-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Example:

Hi, we'd like to schedule a technical interview for the Senior Engineer position at ${companyName}.

Are you available Tuesday, June 25th at 2:00 PM?

The interview will be with our CTO and will last about 1 hour. We'll send you a Zoom link.

Looking forward to speaking with you!`}
          rows={12}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
        />
        <p className="mt-2 text-xs text-neutral-500">
          {text.length} characters {canParse ? "✓" : "(minimum 20 required)"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
        >
          Cancel
        </button>
        <LoadingButton
          onClick={handleParse}
          loading={parseMutation.isPending}
          loadingLabel="Parsing..."
          disabled={!canParse}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <MaterialIcon name="auto_awesome" className="text-[18px]" />
          Parse with AI
        </LoadingButton>
      </div>
    </div>
  );
}
