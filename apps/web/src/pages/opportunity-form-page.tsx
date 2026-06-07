import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { PageIntro } from "../components/app-shell";
import { MaterialIcon } from "../components/material-icon";
import { LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { ParserLoadingState } from "../components/parser-loading-state";
import { api } from "../lib/api";
import type { JobStatus, PipelineType, Priority } from "../lib/types";
import type { ParserRunState } from "../lib/parser-run";

type FormValues = {
  companyName: string;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection: string;
  source: string;
  jobUrl: string;
  nextStep: string;
  notes: string;
  employeesRangeId: string;
  companyStageId: string;
  workModelId: string;
  location: string;
  funding: string;
  customersTraction: string;
  companyDescription: string;
  productDescription: string;
  techStack: string;
  backendFrontendSplit: string;
  compensationNotes: string;
  domainIds: string[];
};

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

function normalizeJobStatus(value: string | null | undefined): JobStatus {
  return statuses.includes(value as JobStatus) ? (value as JobStatus) : "RESEARCH_LEAD";
}

export function OpportunityFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = Boolean(id);
  const { data: options, isLoading: optionsLoading, isError: optionsError, error: optionsErrorValue, refetch: refetchOptions } = useQuery({ queryKey: ["options"], queryFn: api.options });
  const { data: existing, isLoading: existingLoading, isError: existingError, error: existingErrorValue, refetch: refetchExisting } = useQuery({ queryKey: ["opportunity", id], queryFn: () => api.opportunity(id ?? ""), enabled: Boolean(id) });
  const { register, handleSubmit, reset, setValue } = useForm<FormValues>({ defaultValues: { pipelineType: "POTENTIAL", status: "RESEARCH_LEAD", priority: "MEDIUM", domainIds: [] } });
  const [jobText, setJobText] = useState("");
  const [parseResult, setParseResult] = useState<ParsedJobDescription | null>(null);
  const [parsedDomains, setParsedDomains] = useState<string[]>([]);
  const [showParser, setShowParser] = useState(false);
  const [runState, setRunState] = useState<ParserRunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Paste a job or recruiter message to prefill the opportunity form.");
  const [progress, setProgress] = useState(0);
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const domainIds = new Set(values.domainIds);

      for (const label of parsedDomains) {
        const existingDomain = options?.domains.find((item) => item.label.toLowerCase() === label.toLowerCase());

        if (existingDomain) {
          domainIds.add(existingDomain.id);
          continue;
        }

        const created = await api.addDomain(label) as { id: string };
        domainIds.add(created.id);
      }

      const payload = {
        ...values,
        domainIds: [...domainIds]
      };

      return id ? api.updateOpportunity(id, payload) : api.createOpportunity(payload);
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(`/opportunities/${saved.id}`);
    }
  });

  useEffect(() => {
    if (existing) {
      reset({
        companyName: existing.companyName,
        roleTitle: existing.roleTitle,
        pipelineType: existing.pipelineType,
        status: existing.status,
        priority: existing.priority,
        referrerOrConnection: existing.referrerOrConnection ?? "",
        source: existing.source ?? "",
        jobUrl: existing.jobUrl ?? "",
        nextStep: existing.nextStep ?? "",
        notes: existing.notes ?? "",
        employeesRangeId: existing.employeesRangeId ?? "",
        companyStageId: existing.companyStageId ?? "",
        workModelId: existing.workModelId ?? "",
        location: existing.location ?? "",
        funding: existing.funding ?? "",
        customersTraction: existing.customersTraction ?? "",
        companyDescription: existing.companyDescription ?? "",
        productDescription: existing.productDescription ?? "",
        techStack: existing.techStack ?? "",
        backendFrontendSplit: existing.backendFrontendSplit ?? "",
        compensationNotes: existing.compensationNotes ?? "",
        domainIds: existing.domains.map((item) => item.domain.id)
      });
    }
  }, [existing, reset]);

  useEffect(() => {
    if (!parseResult) {
      return;
    }

    setValue("companyName", parseResult.companyName ?? "");
    setValue("roleTitle", parseResult.roleTitle ?? "");
    setValue("pipelineType", parseResult.pipelineType ?? "POTENTIAL");
    setValue("status", normalizeJobStatus(parseResult.status));
    setValue("priority", parseResult.prioritySuggestion ?? "MEDIUM");
    setValue("referrerOrConnection", parseResult.process.knownContact ?? "");
    setValue("source", "AI parsed job description");
    setValue("nextStep", parseResult.process.suggestedNextStep ?? "");
    setValue("notes", parseResult.rawImportantNotes.join("\n"));
    setValue("location", parseResult.company.location ?? "");
    setValue("funding", parseResult.company.funding ?? "");
    setValue("customersTraction", parseResult.company.customersTraction ?? "");
    setValue("companyDescription", parseResult.company.companyDescription ?? "");
    setValue("productDescription", parseResult.company.productDescription ?? "");
    setValue("techStack", parseResult.role.techStack.join(", "));
    setValue("backendFrontendSplit", parseResult.role.backendFrontendSplit ?? "");
    setValue("compensationNotes", parseResult.role.compensation ?? "");
    setParsedDomains(parseResult.company.domains);
  }, [parseResult, setValue]);

  const parseSummary = useMemo(() => {
    if (!parseResult) {
      return null;
    }

    return [
      parseResult.companyName ?? "Unknown company",
      parseResult.roleTitle ?? "Unknown role",
      parseResult.status ?? "RESEARCH_LEAD",
      parseResult.prioritySuggestion ?? "MEDIUM"
    ].join(" · ");
  }, [parseResult]);

  const runParser = async () => {
    const trimmed = jobText.trim();
    setRunError(null);
    setParseResult(null);
    setShowParser(true);
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
      setStatusMessage("Parsed values are ready and the form has been prefilled.");
      setShowParser(true);
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

  if (optionsLoading || (id ? existingLoading : false)) {
    return <PageLoadingState title={id ? "Edit Opportunity" : "Add Opportunity"} description="Loading form options and existing values." />;
  }

  if (optionsError) {
    return <PageErrorState title="Opportunity form" description={optionsErrorValue instanceof Error ? optionsErrorValue.message : "Unable to load form options."} onRetry={() => void refetchOptions()} />;
  }

  if (existingError) {
    return <PageErrorState title="Opportunity form" description={existingErrorValue instanceof Error ? existingErrorValue.message : "Unable to load the selected opportunity."} onRetry={() => void refetchExisting()} />;
  }

  return (
    <>
      <PageIntro title={isEditing ? "Edit Opportunity" : "Add Opportunity"} description="Capture the company, role, research context, and next step." />
      <form className="space-y-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Section
          title="Basic"
          actions={
            !isEditing ? (
              <button className="btn btn-primary" type="button" onClick={() => setShowParser((current) => !current)}>
                <MaterialIcon name={showParser ? "visibility_off" : "auto_awesome"} />
                {showParser ? "Hide" : "Parse job"}
              </button>
            ) : null
          }
        >
          {!isEditing && showParser ? (
            <div className="col-span-full rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-tertiary/10 p-2 text-tertiary">
                  <MaterialIcon name="auto_awesome" />
                </div>
                <div>
                  <h4 className="font-title-sm text-title-sm font-bold">Parse job description</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">Paste a recruiter message or job post, then prefill the opportunity fields.</p>
                </div>
              </div>
              <textarea className="input min-h-48 bg-surface-container-low" value={jobText} onChange={(event) => setJobText(event.target.value)} placeholder="Paste raw company or job text..." />
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <LoadingButton className="btn btn-primary" disabled={runState === "validating_input" || runState === "sending_to_api" || runState === "extracting_fields" || runState === "normalizing_result"} loading={runState === "validating_input" || runState === "sending_to_api" || runState === "extracting_fields" || runState === "normalizing_result"} loadingLabel="Parsing..." icon="psychology" onClick={() => void runParser()}>
                  Parse and prefill
                </LoadingButton>
                {runState === "failed" ? (
                  <LoadingButton className="btn btn-secondary" icon="refresh" onClick={() => void runParser()}>
                    Retry
                  </LoadingButton>
                ) : null}
                {parseResult ? <span className="font-label-md text-label-md text-on-surface-variant">Prefilled from: {parseSummary}</span> : null}
              </div>
              {runState !== "idle" ? (
                <div className="mt-4 space-y-4">
                  <ParserLoadingState state={runState === "failed" ? "failed" : runState === "completed" ? "completed" : runState} message={statusMessage} progress={progress} />
                  {runError ? (
                    <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
                      <p className="font-body-md text-body-md font-semibold">Parsing failed</p>
                      <p className="mt-1 font-body-md text-body-md">{runError}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
          <Field label="Company name"><input className="input" {...register("companyName", { required: true })} /></Field>
          <Field label="Role title"><input className="input" {...register("roleTitle", { required: true })} /></Field>
          <Field label="Pipeline type"><select className="input" {...register("pipelineType")}><option>POTENTIAL</option><option>ACTIVE_PROCESS</option><option>ARCHIVED</option></select></Field>
          <Field label="Status"><select className="input" {...register("status")}>{statuses.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Priority"><select className="input" {...register("priority")}><option>HIGH</option><option>MEDIUM</option><option>LOW</option><option>MAYBE</option></select></Field>
          <Field label="Referrer / connection"><input className="input" {...register("referrerOrConnection")} /></Field>
          <Field label="Job URL"><input className="input" {...register("jobUrl")} /></Field>
          <Field label="Source"><input className="input" {...register("source")} /></Field>
        </Section>
        <Section title="Company details">
          <Field label="Company size"><select className="input" {...register("employeesRangeId")}><option value="">Unset</option>{options?.companySizes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Stage"><select className="input" {...register("companyStageId")}><option value="">Unset</option>{options?.companyStages.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Domains"><select className="input min-h-28" multiple {...register("domainIds")}>{options?.domains.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Work model"><select className="input" {...register("workModelId")}><option value="">Unset</option>{options?.workModels.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></Field>
          <Field label="Location"><input className="input" {...register("location")} /></Field>
          <Field label="Funding"><input className="input" {...register("funding")} /></Field>
          <Field label="Customers / traction"><textarea className="input" {...register("customersTraction")} /></Field>
          <Field label="Company description"><textarea className="input" {...register("companyDescription")} /></Field>
          <Field label="Product description"><textarea className="input" {...register("productDescription")} /></Field>
        </Section>
        <Section title="Role details">
          <Field label="Tech stack"><textarea className="input" {...register("techStack")} /></Field>
          <Field label="Backend/frontend split"><input className="input" {...register("backendFrontendSplit")} /></Field>
          <Field label="Compensation notes"><textarea className="input" {...register("compensationNotes")} /></Field>
          <Field label="Next step"><input className="input" {...register("nextStep")} /></Field>
          <Field label="General notes"><textarea className="input" {...register("notes")} /></Field>
        </Section>
        {!isEditing && parseResult ? (
          <section className="panel p-6">
            <div className="mb-3 flex items-center gap-2">
              <MaterialIcon name="check_circle" className="text-primary" />
              <h3 className="font-title-md text-title-md font-bold">Parsed context</h3>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">The form is prefilled from the parser output. Review the values below before saving.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Field label="Parsed company">{parseResult.companyName ?? "-"}</Field>
              <Field label="Parsed role">{parseResult.roleTitle ?? "-"}</Field>
              <Field label="Parsed status">{parseResult.status ?? "-"}</Field>
              <Field label="Parsed priority">{parseResult.prioritySuggestion ?? "-"}</Field>
              <Field label="Parsed location">{parseResult.company.location ?? "-"}</Field>
              <Field label="Parsed work model">{parseResult.company.workModel ?? "-"}</Field>
            </div>
          </section>
        ) : null}
        <LoadingButton className="btn btn-primary" type="submit" loading={mutation.isPending} loadingLabel="Saving..." icon="save">
          Save Opportunity
        </LoadingButton>
      </form>
    </>
  );
}

function Section({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="panel grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
      <div className="col-span-full flex items-center justify-between gap-4">
        <h3 className="font-title-md text-title-md font-bold">{title}</h3>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1"><span className="label">{label}</span>{children}</label>;
}

const statuses = ["RESEARCH_LEAD", "TO_APPLY", "APPLIED", "RECRUITER_REACHED_OUT", "PHONE_SCHEDULED", "PHONE_DONE", "TECHNICAL_SCHEDULED", "TECHNICAL_DONE", "HOME_ASSIGNMENT", "ASSIGNMENT_SUBMITTED", "FINAL_STAGE", "OFFER", "REJECTED", "PAUSED", "NOT_RELEVANT"];
