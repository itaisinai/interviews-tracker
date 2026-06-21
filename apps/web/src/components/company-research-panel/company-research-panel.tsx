import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { CompanyResearchExistingData, CompanyResearchResult } from "../../lib/types";
import { companyResearchRunMeta, companyResearchStepMessages, type CompanyResearchRunState } from "../../lib/company-research";
import { CompanyResearchProgress } from "./company-research-progress";
import { CompanyResearchReview } from "./company-research-review";
import { Field, splitListInput } from "./company-research-fields";
import { MaterialIcon } from "@interviews-tracker/design-system";

type CompanyResearchPanelProps = {
  companyName: string;
  roleTitle?: string | null;
  knownContext?: string | null;
  existingCompanyData?: CompanyResearchExistingData | null;
  targetOpportunityId?: string | null;
  onSaved?: (research: CompanyResearchResult) => void;
};

export type EditableResearchField = keyof Pick<
  CompanyResearchResult,
  | "companyName"
  | "companySearchName"
  | "linkedinUrl"
  | "funding"
  | "totalRaised"
  | "latestRound"
  | "investmentRounds"
  | "employees"
  | "location"
  | "customersTraction"
  | "companyDescription"
  | "productDescription"
>;

export type EditableResearchListField = keyof Pick<
  CompanyResearchResult,
  "investors" | "domains" | "sourceUrls" | "rawImportantNotes"
>;

export function CompanyResearchPanel({ companyName, roleTitle, knownContext, existingCompanyData, targetOpportunityId, onSaved }: CompanyResearchPanelProps) {
  const queryClient = useQueryClient();
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [runState, setRunState] = useState<CompanyResearchRunState>("idle");
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [research, setResearch] = useState<CompanyResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const activeRunIdRef = useRef(0);

  const isRunning = runState === "searching_web" || runState === "reading_sources" || runState === "extracting_facts";
  const currentStep = useMemo(() => companyResearchStepMessages[Math.min(stageIndex, companyResearchStepMessages.length - 1)] ?? companyResearchStepMessages[0], [stageIndex]);
  const actionLabel = research ? "Research again" : "Research company";

  useEffect(() => {
    return () => {
      activeRunIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value < 60) return Math.min(value + 2.5, 60);
        if (value < 88) return Math.min(value + 1.25, 88);
        return value;
      });
    }, 250);

    return () => window.clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (runState === "completed") {
      setProgress(100);
      return;
    }

    if (runState === "failed") {
      setProgress(100);
      return;
    }

    if (runState === "idle") {
      setProgress(0);
    }
  }, [runState]);

  async function runResearch() {
    const runId = activeRunIdRef.current + 1;
    activeRunIdRef.current = runId;
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setResearch(null);
    setStageIndex(0);
    setRunState("searching_web");
    setProgress(8);

    const stageTimers = [
      window.setTimeout(() => {
        if (activeRunIdRef.current === runId) setStageIndex(1);
      }, 180),
      window.setTimeout(() => {
        if (activeRunIdRef.current === runId) setStageIndex(2);
      }, 700),
      window.setTimeout(() => {
        if (activeRunIdRef.current === runId) setStageIndex(3);
      }, 1300)
    ];

    try {
      const response = await api.researchCompany(companyName, {
        companyName,
        roleTitle: roleTitle ?? null,
        knownContext: knownContext ?? null,
        linkedinUrl: linkedinUrl.trim() || null,
        existingCompanyData: existingCompanyData ?? null,
        forceResearch: true
      });

      stageTimers.forEach((timer) => window.clearTimeout(timer));
      if (activeRunIdRef.current !== runId) {
        return;
      }
      setResearch(response.research);
      setStageIndex(4);
      setRunState("completed");
    } catch (caughtError) {
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      if (activeRunIdRef.current !== runId) {
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "Company research failed");
      setRunState("failed");
    }
  }

  async function saveResearch() {
    if (!research) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const response = await api.applyCompanyResearch(companyName, {
        targetOpportunityId: targetOpportunityId ?? null,
        research
      });

      setSaveMessage(`Saved to ${response.updatedOpportunities} opportunity${response.updatedOpportunities === 1 ? "" : " records"}.`);
      void queryClient.invalidateQueries({ queryKey: ["company", companyName] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      if (targetOpportunityId) {
        void queryClient.invalidateQueries({ queryKey: ["opportunity", targetOpportunityId] });
      }
      onSaved?.(research);
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "Unable to save research");
    } finally {
      setIsSaving(false);
    }
  }

  function cancelResearch() {
    setResearch(null);
    setError(null);
    setSaveError(null);
    setSaveMessage(null);
    setEditingField(null);
    setStageIndex(0);
    setRunState("idle");
    setProgress(0);
  }


  function updateResearchField(field: EditableResearchField, value: string | null) {
    setResearch((current) => current ? { ...current, [field]: value } : current);
  }

  function updateResearchListField(field: EditableResearchListField, value: string) {
    setResearch((current) => current ? { ...current, [field]: splitListInput(value) } : current);
  }

  function updateResearchRoundsCount(value: string | null) {
    setResearch((current) => {
      if (!current) {
        return current;
      }

      const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
      return {
        ...current,
        roundsCount: Number.isNaN(parsed) ? null : parsed
      };
    });
  }

  return (
    <section className="panel border border-outline-variant p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/10 text-tertiary">
              <MaterialIcon name="travel_explore" />
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Company research</p>
              <h3 className="font-title-md text-title-md font-bold">{companyName}</h3>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-body-md text-on-surface-variant">
            {research ? "Review the extracted company research before saving it to the CRM." : "Searches public sources to fill in missing company facts such as funding, investors, size, location, and traction."}
          </p>
          <div className="mt-4 max-w-2xl">
            <Field label="LinkedIn URL">
              <input
                className="input"
                value={linkedinUrl}
                onChange={(event) => setLinkedinUrl(event.target.value)}
                placeholder="https://www.linkedin.com/company/..."
              />
            </Field>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn btn-primary" onClick={() => void runResearch()} disabled={isRunning || isSaving}>
            <MaterialIcon name="travel_explore" />
            {isRunning ? "Researching..." : actionLabel}
          </button>
          {research ? (
            <button className="btn btn-secondary" onClick={() => void runResearch()} disabled={isRunning || isSaving}>
              <MaterialIcon name="refresh" />
              Research again
            </button>
          ) : null}
        </div>
      </div>

      {runState !== "idle" ? (
        <CompanyResearchProgress
          runState={runState}
          stageIndex={stageIndex}
          progress={progress}
          currentStep={currentStep}
          error={error}
        />
      ) : null}

      {research ? (
        <CompanyResearchReview
          companyName={companyName}
          existingCompanyData={existingCompanyData}
          research={research}
          editingField={editingField}
          isSaving={isSaving}
          saveMessage={saveMessage}
          saveError={saveError}
          onCancel={cancelResearch}
          onSave={() => void saveResearch()}
          onEditField={setEditingField}
          onUpdateField={updateResearchField}
          onUpdateListField={updateResearchListField}
          onUpdateRoundsCount={updateResearchRoundsCount}
        />
      ) : null}
    </section>
  );
}
