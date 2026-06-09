import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { Badge } from "../badge";
import type { CompanyResearchExistingData, CompanyResearchResult } from "../../lib/types";
import { MaterialIcon } from "../material-icon";
import { companyResearchLogTone, companyResearchRunMeta, companyResearchStepMessages, type CompanyResearchRunState } from "../../lib/company-research";
import { LoadingButton } from "../loading-state";

type CompanyResearchPanelProps = {
  companyName: string;
  roleTitle?: string | null;
  knownContext?: string | null;
  existingCompanyData?: CompanyResearchExistingData | null;
  targetOpportunityId?: string | null;
  onSaved?: () => void;
};

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
      onSaved?.();
    } catch (caughtError) {
      setSaveError(caughtError instanceof Error ? caughtError.message : "Unable to save research");
    } finally {
      setIsSaving(false);
    }
  }

  const loadingTone = companyResearchRunMeta[runState].tone;

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
        <div className="mt-6">
          <div className="flex items-start gap-4">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${loadingTone === "danger" ? "bg-error-container text-on-error-container" : loadingTone === "success" ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"}`}>
              {runState === "failed" ? <MaterialIcon name="error" filled /> : runState === "completed" ? <MaterialIcon name="check_circle" filled /> : <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Research run</p>
              <h4 className="mt-1 font-title-md text-title-md font-bold">{companyResearchRunMeta[runState].label}</h4>
              <p className="mt-1 text-body-md text-on-surface-variant">{companyResearchRunMeta[runState].description}</p>
              {runState !== "completed" ? <p className="mt-2 text-body-md text-on-surface-variant">Current step: {currentStep}</p> : null}
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${runState === "failed" ? "bg-error" : runState === "completed" ? "bg-primary" : "bg-secondary"}`}
              style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
            />
          </div>

          <ol className="mt-5 space-y-2">
            {companyResearchStepMessages.map((message, index) => {
              const status = runState === "failed"
                ? (index <= stageIndex ? "error" : "pending")
                : runState === "completed"
                  ? "done"
                  : index < stageIndex
                    ? "done"
                    : index === stageIndex
                      ? "active"
                      : "pending";
              const tone = companyResearchLogTone[status];

              return (
                <li key={message} className={`flex items-start gap-3 rounded-lg bg-white px-3 py-2 ${tone.ring ?? ""}`}>
                  <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                  <span className={`text-body-md ${tone.text}`}>{message}</span>
                </li>
              );
            })}
          </ol>

          {error ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{error}</p> : null}
        </div>
      ) : null}

      {research ? (
        <div className="mt-6 rounded-2xl border border-outline-variant bg-surface-container-low p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Review</p>
              <h4 className="font-title-md text-title-md font-bold">Extracted company research</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">{research.confidence} confidence</span>
              <LoadingButton className="btn btn-primary" loading={isSaving} loadingLabel="Saving..." icon="save" onClick={() => void saveResearch()}>
                Save research
              </LoadingButton>
            </div>
          </div>

          {saveMessage ? <p className="mt-4 rounded-lg bg-primary-container px-4 py-3 text-body-md text-on-primary-container">{saveMessage}</p> : null}
          {saveError ? <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{saveError}</p> : null}

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Detail label="LinkedIn URL" value={research.linkedinUrl} status={diffStatus(null, research.linkedinUrl)} />
            <Detail label="Funding" value={research.funding} status={diffStatus(existingCompanyData?.funding ?? null, research.funding)} />
            <Detail label="Total raised" value={research.totalRaised} status={diffStatus(null, research.totalRaised)} />
            <Detail label="Rounds count" value={research.roundsCount != null ? String(research.roundsCount) : null} status={diffStatus(null, research.roundsCount != null ? String(research.roundsCount) : null)} />
            <Detail label="Latest round" value={research.latestRound} status={diffStatus(null, research.latestRound)} />
            <Detail label="Investors" value={research.investors.length > 0 ? research.investors.join(", ") : null} status={diffStatus(null, research.investors.length > 0 ? research.investors.join(", ") : null)} />
            <Detail label="Investment rounds" value={research.investmentRounds} status={diffStatus(existingCompanyData?.investmentRounds ?? null, research.investmentRounds)} />
            <Detail label="Employees" value={research.employees} status={diffStatus(existingCompanyData?.employees ?? null, research.employees)} />
            <Detail label="Location" value={research.location} status={diffStatus(existingCompanyData?.location ?? null, research.location)} />
            <Detail label="Domains" value={research.domains.length > 0 ? research.domains.join(", ") : null} status={diffStatus(null, research.domains.length > 0 ? research.domains.join(", ") : null)} />
            <Detail label="Customers / traction" value={research.customersTraction} status={diffStatus(existingCompanyData?.customersTraction ?? null, research.customersTraction)} />
            <Detail label="Company description" value={research.companyDescription} status={diffStatus(existingCompanyData?.companyDescription ?? null, research.companyDescription)} />
            <Detail label="Product description" value={research.productDescription} status={diffStatus(existingCompanyData?.productDescription ?? null, research.productDescription)} />
          </div>

          <div className="mt-5">
            <p className="label">Source URLs</p>
            <div className="mt-2 flex flex-col gap-2">
              {research.sourceUrls.length > 0 ? research.sourceUrls.map((url) => (
                <a key={url} className="inline-flex items-center gap-2 text-body-md text-primary hover:underline" href={url} target="_blank" rel="noreferrer">
                  <MaterialIcon name="open_in_new" className="text-[16px]" />
                  {url}
                </a>
              )) : <p className="text-body-md text-on-surface-variant">No source URLs available.</p>}
            </div>
          </div>

          {research.rawImportantNotes.length > 0 ? (
            <div className="mt-5">
              <p className="label">Important notes</p>
              <ul className="mt-2 space-y-2">
                {research.rawImportantNotes.map((note) => (
                  <li key={note} className="rounded-lg bg-white px-3 py-2 text-body-md text-on-surface-variant">{note}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type DiffStatus = "NEW" | "UPDATED" | null;

function diffStatus(existing: string | null | undefined, next: string | null | undefined): DiffStatus {
  const current = normalizeComparable(existing);
  const incoming = normalizeComparable(next);

  if (!incoming) {
    return null;
  }

  if (!current) {
    return "NEW";
  }

  return current === incoming ? null : "UPDATED";
}

function normalizeComparable(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ").toLowerCase() ?? "";
}

function Detail({ label, value, status }: { label: string; value: string | null; status?: DiffStatus }) {
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="label">{label}</p>
        {status ? <Badge value={status} tone={status === "NEW" ? "green" : "violet"} /> : null}
      </div>
      {isUrl && value ? (
        <a
          className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-body-md text-primary hover:underline"
          href={value}
          target="_blank"
          rel="noreferrer"
        >
          <MaterialIcon name="open_in_new" className="text-[16px]" />
          <span>{value}</span>
        </a>
      ) : (
        <p className="mt-1 whitespace-pre-line text-body-md text-on-surface-variant">{value || "-"}</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
