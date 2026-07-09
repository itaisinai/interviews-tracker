import { type ReactNode, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { LoadingButton, MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../components/app-shell";
import { ParserLoadingState } from "../components/parser-loading-state";
import { api } from "../lib/api";
import { jobStatusOptions, labelForJobStatus, labelForPipelineType, labelForPriority } from "../lib/enum-labels";
import type { ParserRunState } from "../lib/parser-run";
import type { JobStatus, Option, PipelineType, Priority } from "../lib/types";

type ParsedJobDescription = Awaited<ReturnType<typeof api.parseJob>>;

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function friendlyParseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("API auth token is not ready") || message.includes("API auth token is empty")) {
    return "Your session is still loading. Wait a moment and try again.";
  }

  if (message.includes("Missing bearer token")) {
    return "Your session is not ready yet. Refresh the page and try again.";
  }

  if (message.includes("Validation failed")) {
    return "The parser could not validate this input. Try adjusting the pasted text and retry.";
  }

  return "The parser could not complete this run. Please try again.";
}

const validJobStatuses = new Set(jobStatusOptions.map((item) => item.value));

function normalizeJobStatus(value: string | null | undefined): JobStatus {
  return validJobStatuses.has(value as JobStatus) ? (value as JobStatus) : "RESEARCH_LEAD";
}

function normalizeLookupValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findMatchingOption(options: Option[] | undefined, value: string | null | undefined) {
  const target = value?.trim();
  if (!target) return null;
  const normalizedTarget = normalizeLookupValue(target);
  return (
    options?.find((option) => {
      const normalizedOption = normalizeLookupValue(option.label);
      return (
        normalizedOption === normalizedTarget ||
        normalizedOption.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedOption)
      );
    }) ?? null
  );
}

function ValueRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
      <p className="font-label-md text-label-md uppercase text-on-surface-variant">{label}</p>
      <div className="mt-2 text-body-md text-on-background">{value}</div>
    </div>
  );
}

export function OpportunityFormPage() {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] = useState<ParsedJobDescription | null>(null);
  const [runState, setRunState] = useState<ParserRunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Paste raw company or job text, review the parsed opportunity, then save."
  );
  const [progress, setProgress] = useState(0);
  const {
    data: options,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["options"], queryFn: api.options });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isBusy =
    runState === "validating_input" ||
    runState === "sending_to_api" ||
    runState === "extracting_fields" ||
    runState === "normalizing_result";

  const companySizeOption = findMatchingOption(options?.companySizes, parseResult?.company.employees);
  const companyStageOption = findMatchingOption(options?.companyStages, parseResult?.company.stage);
  const workModelOption = findMatchingOption(options?.workModels, parseResult?.company.workModel);
  const parsedDomains = useMemo(() => {
    const raw = parseResult?.company.domains ?? [];
    return [...new Set(raw.map((item) => item.trim()).filter(Boolean))];
  }, [parseResult]);

  const create = useMutation({
    mutationFn: async () => {
      if (!parseResult) {
        throw new Error("Nothing parsed");
      }

      const companyName = parseResult.companyName?.trim();
      const roleTitle = parseResult.roleTitle?.trim();

      if (!companyName || !roleTitle) {
        throw new Error("The parser must extract both a company name and a role title before saving.");
      }

      const domainIds = new Set<string>();
      for (const label of parsedDomains) {
        const existing = options?.domains.find(
          (item) =>
            normalizeLookupValue(item.label) === normalizeLookupValue(label) ||
            normalizeLookupValue(item.label).includes(normalizeLookupValue(label)) ||
            normalizeLookupValue(label).includes(normalizeLookupValue(item.label))
        );
        if (existing) {
          domainIds.add(existing.id);
          continue;
        }

        const created = (await api.addDomain(label)) as { id: string };
        domainIds.add(created.id);
      }

      return api.createOpportunity({
        companyName,
        roleTitle,
        pipelineType: parseResult.pipelineType ?? "POTENTIAL",
        status: normalizeJobStatus(parseResult.status),
        priority: parseResult.prioritySuggestion ?? "MEDIUM",
        referrerOrConnection: parseResult.process.knownContact,
        source: "AI parsed job description",
        nextStep: parseResult.process.suggestedNextStep,
        notes: parseResult.rawImportantNotes.join("\n"),
        employeesRangeId: companySizeOption?.id,
        companyStageId: companyStageOption?.id,
        workModelId: workModelOption?.id,
        location: parseResult.company.location,
        funding: parseResult.company.funding,
        companyDescription: parseResult.company.companyDescription,
        productDescription: parseResult.company.productDescription,
        customersTraction: parseResult.company.customersTraction,
        techStack: parseResult.role.techStack.join(", "),
        backendFrontendSplit: parseResult.role.backendFrontendSplit,
        compensationNotes: parseResult.role.compensation,
        domainIds: [...domainIds],
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(`/opportunities/${saved.slug}`);
    },
  });

  const parseSummary = useMemo(() => {
    if (!parseResult) {
      return null;
    }

    return [
      parseResult.companyName ?? "Unknown company",
      parseResult.roleTitle ?? "Unknown role",
      parseResult.status ?? "RESEARCH_LEAD",
      parseResult.prioritySuggestion ?? "MEDIUM",
    ].join(" · ");
  }, [parseResult]);

  const runParser = async (inputText: string) => {
    const trimmed = inputText.trim();
    setRunError(null);
    setParseResult(null);
    setProgress(8);
    setRunState("validating_input");
    setStatusMessage("Checking the pasted text and preparing it for parsing.");

    if (trimmed.length < 20) {
      await sleep(120);
      const message = "Paste at least a few lines so the parser has enough context to work with.";
      setRunError(message);
      setStatusMessage("The pasted text is too short to parse reliably.");
      setProgress(100);
      setRunState("failed");
      return;
    }

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 88) return 88;
        if (current < 35) return current + 1;
        if (current < 60) return current + 2;
        return current + 1;
      });
    }, 180);

    try {
      await sleep(120);
      setRunState("sending_to_api");
      setStatusMessage("Sending the text to the AI parser.");

      const parsePromise = api.parseJob(trimmed);
      await sleep(160);
      setRunState("extracting_fields");
      setStatusMessage("The AI is extracting company, role, and process details.");

      const parsed = await parsePromise;
      setRunState("normalizing_result");
      setStatusMessage("Normalizing the structured result for review.");
      setProgress(90);
      setRunState("completed");
      await sleep(100);
      setProgress(100);
      setParseResult(parsed);
      setStatusMessage("Ready for review.");
    } catch (error) {
      const message = friendlyParseError(error);
      setRunError(message);
      setStatusMessage(message);
      setProgress(100);
      setRunState("failed");
    } finally {
      window.clearInterval(progressTimer);
    }
  };

  if (isLoading) {
    return <PageLoadingState title="Add Opportunity" description="Loading option lists for the review step." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Add Opportunity"
        description={error instanceof Error ? error.message : "Unable to load opportunity options."}
        onRetry={() => void refetch()}
      />
    );
  }

  const canSave = Boolean(parseResult?.companyName?.trim() && parseResult?.roleTitle?.trim() && !create.isPending);
  const pipelineType = (parseResult?.pipelineType ?? "POTENTIAL") as PipelineType;
  const priority = (parseResult?.prioritySuggestion ?? "MEDIUM") as Priority;

  return (
    <>
      <PageIntro
        title="Add Opportunity"
        description="Paste a job post or recruiter message, parse it, then save the structured opportunity."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-tertiary/10 p-2 text-tertiary">
              <MaterialIcon name="auto_awesome" />
            </div>
            <h3 className="font-title-md text-title-md font-bold">Raw Input</h3>
          </div>
          <textarea
            className="input min-h-[360px] bg-surface-container-low"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste a long job or recruiter message..."
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <LoadingButton
              className="btn btn-primary"
              disabled={isBusy}
              loading={isBusy}
              loadingLabel="Parsing..."
              icon="psychology"
              onClick={() => void runParser(text)}
            >
              Parse
            </LoadingButton>
            {runState === "failed" ? (
              <LoadingButton className="btn btn-secondary" icon="refresh" onClick={() => void runParser(text)}>
                Retry
              </LoadingButton>
            ) : null}
          </div>
        </section>
        <section className="panel p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-title-md text-title-md font-bold">Review Parsed Data</h3>
              <p className="mt-1 text-body-md text-on-surface-variant">
                The form is generated from the parser output. The remaining values are auto-mapped where possible.
              </p>
            </div>
            {parseResult ? (
              <LoadingButton
                className="btn btn-primary"
                loading={create.isPending}
                loadingLabel="Saving..."
                icon="save"
                disabled={!canSave}
                onClick={() => create.mutate()}
              >
                Save opportunity
              </LoadingButton>
            ) : null}
          </div>
          {runState !== "idle" ? (
            <div className="mb-4 space-y-4">
              <ParserLoadingState
                state={runState === "failed" ? "failed" : runState === "completed" ? "completed" : runState}
                message={statusMessage}
                progress={progress}
              />
              {runError ? (
                <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
                  <p className="font-body-md text-body-md font-semibold">Parsing failed</p>
                  <p className="mt-1 font-body-md text-body-md">{runError}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {create.error ? (
            <div className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
              <p className="font-body-md text-body-md font-semibold">Save failed</p>
              <p className="mt-1 font-body-md text-body-md">
                {create.error instanceof Error ? create.error.message : "Unable to save the opportunity."}
              </p>
            </div>
          ) : null}
          {parseResult ? (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">
                  {labelForPipelineType(pipelineType)}
                </span>
                <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
                  {labelForJobStatus(normalizeJobStatus(parseResult.status))}
                </span>
                <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
                  {labelForPriority(priority)}
                </span>
              </div>
              {!canSave ? (
                <div className="mb-4 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-on-warning-container">
                  The parser must extract both a company name and a role title before this can be saved.
                </div>
              ) : null}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ValueRow label="Company" value={parseResult.companyName ?? "-"} />
                <ValueRow label="Role" value={parseResult.roleTitle ?? "-"} />
                <ValueRow label="Status" value={labelForJobStatus(normalizeJobStatus(parseResult.status))} />
                <ValueRow label="Priority" value={labelForPriority(priority)} />
                <ValueRow
                  label="Company size"
                  value={companySizeOption?.label ?? parseResult.company.employees ?? "-"}
                />
                <ValueRow label="Stage" value={companyStageOption?.label ?? parseResult.company.stage ?? "-"} />
                <ValueRow label="Work model" value={workModelOption?.label ?? parseResult.company.workModel ?? "-"} />
                <ValueRow label="Location" value={parseResult.company.location ?? "-"} />
                <ValueRow label="Known contact" value={parseResult.process.knownContact ?? "-"} />
                <ValueRow label="Next step" value={parseResult.process.suggestedNextStep ?? "-"} />
                <ValueRow label="Company description" value={parseResult.company.companyDescription ?? "-"} />
                <ValueRow label="Product description" value={parseResult.company.productDescription ?? "-"} />
              </div>
              <div className="mt-4">
                <p className="label">Domains</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {parsedDomains.length > 0 ? (
                    parsedDomains.map((domain) => (
                      <span
                        key={domain}
                        className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container"
                      >
                        {domain}
                      </span>
                    ))
                  ) : (
                    <span className="text-body-md text-on-surface-variant">-</span>
                  )}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <ValueRow
                  label="Tech stack"
                  value={parseResult.role.techStack.length > 0 ? parseResult.role.techStack.join(", ") : "-"}
                />
                <ValueRow label="Backend / frontend split" value={parseResult.role.backendFrontendSplit ?? "-"} />
                <ValueRow label="Compensation" value={parseResult.role.compensation ?? "-"} />
                <ValueRow label="Customers / traction" value={parseResult.company.customersTraction ?? "-"} />
              </div>
              {parseResult.rawImportantNotes.length > 0 ? (
                <div className="mt-4">
                  <p className="label">Important notes</p>
                  <ul className="mt-2 space-y-2 rounded-xl bg-surface-container-low p-4">
                    {parseResult.rawImportantNotes.map((note) => (
                      <li key={note} className="text-body-md text-on-background">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="mt-4 text-body-md text-on-surface-variant">
                The parser will auto-create missing domains and map company size, stage, and work model when the labels
                match existing options.
              </p>
            </>
          ) : runState === "failed" ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant">
              The input is still here. Fix the issue and retry.
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface-container-low text-on-surface-variant">
              Parsed fields will appear here.
            </div>
          )}
        </section>
      </div>
    </>
  );
}
