import { type ReactNode, useMemo, useState } from "react";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { LoadingButton, MaterialIcon, ProcessStateCard } from "@interviews-tracker/design-system";

import { api } from "../../lib/api";
import { getErrorMessage } from "../../lib/error";
import type { Interaction, InteractionDraft } from "../../lib/types";

import { InteractionDraftFields } from "./interaction-draft-fields";

type InteractionTextParserPanelProps = {
  opportunitySlug: string;
  companyName: string;
  roleTitle: string;
  onSaved?: (interaction?: Interaction) => void;
};

export function InteractionTextParserPanel({
  opportunitySlug,
  companyName,
  roleTitle,
  onSaved,
}: InteractionTextParserPanelProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<InteractionDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [runState, setRunState] = useState<"idle" | "parsing" | "ready" | "failed">("idle");
  const [progress, setProgress] = useState(0);
  const [runMessage, setRunMessage] = useState("Paste any recruiter message, interview note, or calendar text.");

  const isParsing = runState === "parsing";
  const actionLabel = draft ? "Parse again" : "Parse text";
  const meta = useMemo(() => {
    if (runState === "failed") {
      return { title: "Parsing failed", tone: "danger" as const };
    }
    if (runState === "ready") {
      return { title: "Ready for review", tone: "success" as const };
    }
    if (runState === "parsing") {
      return { title: "Parsing text", tone: "busy" as const };
    }
    return { title: "Ready", tone: "neutral" as const };
  }, [runState]);

  const saveInteraction = useMutation({
    mutationFn: async () => {
      if (!draft) {
        throw new Error("No parsed interaction is ready to save.");
      }
      return api.createInteraction(opportunitySlug, draft);
    },
    onSuccess: (savedInteraction) => {
      void queryClient.invalidateQueries({
        queryKey: ["opportunity", opportunitySlug],
      });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setSaveMessage("Interaction created.");
      onSaved?.(savedInteraction);
    },
    onError: (caughtError) => {
      setSaveError(getErrorMessage(caughtError));
    },
  });

  async function parseText() {
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setRunState("parsing");
    setProgress(12);
    setRunMessage("Sending pasted text to the AI parser.");

    try {
      const response = await api.parseOpportunityInteractionText(opportunitySlug, { text });
      setDraft(response.interaction);
      setRunState("ready");
      setProgress(100);
      setRunMessage("Review the parsed interaction before saving.");
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
      setRunState("failed");
      setProgress(100);
      setRunMessage("Parsing failed.");
    }
  }

  const resetToDraft = () => {
    setText("");
    setDraft(null);
    setRunState("idle");
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setRunMessage("Paste any recruiter message, interview note, or calendar text.");
    setProgress(0);
  };

  return (
    <section className="rounded-2xl border border-outline-variant bg-surface-container-low p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Free text parser</p>
          <h4 className="font-title-md text-title-md font-bold">Paste message or notes</h4>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {companyName} · {roleTitle}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={resetToDraft}>
          <MaterialIcon name="refresh" />
          Reset
        </button>
      </div>

      <Field label="Text to parse">
        <textarea
          className="input min-h-40"
          placeholder="Paste recruiter messages, interview notes, calendar text, email snippets, or WhatsApp messages here..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <LoadingButton
          className="btn btn-primary"
          loading={isParsing}
          loadingLabel="Parsing..."
          icon="auto_awesome"
          onClick={() => void parseText()}
          disabled={text.trim().length < 20}
        >
          {actionLabel}
        </LoadingButton>
        {draft ? (
          <LoadingButton
            className="btn btn-secondary"
            loading={saveInteraction.isPending}
            loadingLabel="Saving..."
            icon="save"
            onClick={() => void saveInteraction.mutate()}
          >
            Save interaction
          </LoadingButton>
        ) : null}
      </div>

      <div className="mt-4">
        <ProcessStateCard
          title="Text parsing"
          message={meta.title}
          description={runMessage}
          tone={meta.tone}
          progress={progress}
        />
      </div>

      {error && runState === "failed" ? (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Parsing failed</p>
          <p className="mt-1 font-body-md text-body-md">{error}</p>
        </div>
      ) : null}

      {saveError ? (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Save failed</p>
          <p className="mt-1 font-body-md text-body-md">{saveError}</p>
        </div>
      ) : null}

      {saveMessage ? (
        <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">
          {saveMessage}
        </p>
      ) : null}

      {draft ? (
        <div className="mt-5 rounded-2xl border border-outline-variant bg-white p-5">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review interaction</p>
          {draft.meetingLink ? (
            <p className="mt-2 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-body-md text-on-background">
              <span className="font-semibold text-on-surface-variant">Meeting link: </span>
              <a
                className="text-primary hover:underline"
                href={draft.meetingLink}
                rel="noreferrer noopener"
                target="_blank"
              >
                {draft.meetingLink}
              </a>
            </p>
          ) : null}
          <InteractionDraftFields draft={draft} setDraft={setDraft} />
        </div>
      ) : null}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mt-4 block space-y-1">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
