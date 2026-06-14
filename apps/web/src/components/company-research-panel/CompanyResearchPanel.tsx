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
  onSaved?: (research: CompanyResearchResult) => void;
};

type EditableResearchField = keyof Pick<
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

type EditableResearchListField = keyof Pick<
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

  const loadingTone = companyResearchRunMeta[runState].tone;

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
            <EditableDetail label="Company title" value={research.companyName} editing={editingField === "companyName"} onEdit={() => setEditingField("companyName")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("companyName", value || companyName)} status={diffStatus(companyName, research.companyName)} />
            <EditableDetail label="English search name" value={research.companySearchName} editing={editingField === "companySearchName"} onEdit={() => setEditingField("companySearchName")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("companySearchName", value)} status={diffStatus(existingCompanyData?.companySearchName ?? null, research.companySearchName)} />
            <EditableDetail label="LinkedIn URL" value={research.linkedinUrl} editing={editingField === "linkedinUrl"} onEdit={() => setEditingField("linkedinUrl")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("linkedinUrl", value)} status={diffStatus(null, research.linkedinUrl)} />
            <EditableDetail label="Funding" value={research.funding} editing={editingField === "funding"} onEdit={() => setEditingField("funding")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("funding", value)} status={diffStatus(existingCompanyData?.funding ?? null, research.funding)} multiline />
            <EditableDetail label="Total raised" value={research.totalRaised} editing={editingField === "totalRaised"} onEdit={() => setEditingField("totalRaised")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("totalRaised", value)} status={diffStatus(null, research.totalRaised)} />
            <EditableDetail label="Rounds count" value={research.roundsCount != null ? String(research.roundsCount) : null} editing={editingField === "roundsCount"} onEdit={() => setEditingField("roundsCount")} onDone={() => setEditingField(null)} onChange={updateResearchRoundsCount} status={diffStatus(null, research.roundsCount != null ? String(research.roundsCount) : null)} />
            <EditableDetail label="Latest round" value={research.latestRound} editing={editingField === "latestRound"} onEdit={() => setEditingField("latestRound")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("latestRound", value)} status={diffStatus(null, research.latestRound)} />
            <EditableDetail label="Investors" value={research.investors.length > 0 ? research.investors.join(", ") : null} editing={editingField === "investors"} onEdit={() => setEditingField("investors")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchListField("investors", value ?? "")} status={diffStatus(null, research.investors.length > 0 ? research.investors.join(", ") : null)} multiline />
            <EditableDetail label="Investment rounds" value={research.investmentRounds} editing={editingField === "investmentRounds"} onEdit={() => setEditingField("investmentRounds")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("investmentRounds", value)} status={diffStatus(existingCompanyData?.investmentRounds ?? null, research.investmentRounds)} multiline />
            <EditableDetail label="Employees" value={research.employees} editing={editingField === "employees"} onEdit={() => setEditingField("employees")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("employees", value)} status={diffStatus(existingCompanyData?.employees ?? null, research.employees)} />
            <EditableDetail label="Location" value={research.location} editing={editingField === "location"} onEdit={() => setEditingField("location")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("location", value)} status={diffStatus(existingCompanyData?.location ?? null, research.location)} />
            <EditableDetail label="Domains" value={research.domains.length > 0 ? research.domains.join(", ") : null} editing={editingField === "domains"} onEdit={() => setEditingField("domains")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchListField("domains", value ?? "")} status={diffStatus(null, research.domains.length > 0 ? research.domains.join(", ") : null)} />
            <EditableDetail label="Customers / traction" value={research.customersTraction} editing={editingField === "customersTraction"} onEdit={() => setEditingField("customersTraction")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("customersTraction", value)} status={diffStatus(existingCompanyData?.customersTraction ?? null, research.customersTraction)} multiline />
            <EditableDetail label="Company description" value={research.companyDescription} editing={editingField === "companyDescription"} onEdit={() => setEditingField("companyDescription")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("companyDescription", value)} status={diffStatus(existingCompanyData?.companyDescription ?? null, research.companyDescription)} multiline />
            <EditableDetail label="Product description" value={research.productDescription} editing={editingField === "productDescription"} onEdit={() => setEditingField("productDescription")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchField("productDescription", value)} status={diffStatus(existingCompanyData?.productDescription ?? null, research.productDescription)} multiline />
          </div>

          <div className="mt-5">
            <EditableDetail label="Source URLs" value={research.sourceUrls.join("\n")} editing={editingField === "sourceUrls"} onEdit={() => setEditingField("sourceUrls")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchListField("sourceUrls", value ?? "")} multiline />
          </div>

          <div className="mt-5">
            <EditableDetail label="Important notes" value={research.rawImportantNotes.join("\n")} editing={editingField === "rawImportantNotes"} onEdit={() => setEditingField("rawImportantNotes")} onDone={() => setEditingField(null)} onChange={(value) => updateResearchListField("rawImportantNotes", value ?? "")} multiline />
          </div>
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

function splitListInput(value: string) {
  return value
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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

function EditableDetail({
  label,
  value,
  status,
  editing,
  multiline = false,
  onEdit,
  onDone,
  onChange
}: {
  label: string;
  value: string | null;
  status?: DiffStatus;
  editing: boolean;
  multiline?: boolean;
  onEdit: () => void;
  onDone: () => void;
  onChange: (value: string | null) => void;
}) {
  const isUrl = typeof value === "string" && /^https?:\/\//i.test(value);

  return (
    <div>
      <div className="flex items-center gap-2">
        <p className="label">{label}</p>
        {status ? <Badge value={status} tone={status === "NEW" ? "green" : "violet"} /> : null}
        <button
          type="button"
          className="rounded-full p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-background"
          aria-label={`Edit ${label}`}
          title={`Edit ${label}`}
          onClick={onEdit}
        >
          <MaterialIcon name="edit" className="text-[16px]" />
        </button>
      </div>
      {editing ? (
        <div className="mt-2 space-y-2">
          {multiline ? (
            <textarea
              className="input min-h-24"
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
            />
          ) : (
            <input
              className="input"
              value={value ?? ""}
              onChange={(event) => onChange(event.target.value || null)}
            />
          )}
          <button type="button" className="btn btn-secondary" onClick={onDone}>
            <MaterialIcon name="check" />
            Save
          </button>
        </div>
      ) : isUrl && value ? (
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
