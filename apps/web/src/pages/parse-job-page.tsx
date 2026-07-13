import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

import { PageIntro } from "../components/app-layout";
import { ParserLoadingState } from "../components/parser-loading-state";
import { api } from "../lib/api";
import type { ParserRunState } from "../lib/parser-run";

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

export function ParseJobPage() {
  const [text, setText] = useState("");
  const [parseResult, setParseResult] = useState<ParsedJobDescription | null>(null);
  const [runState, setRunState] = useState<ParserRunState>("idle");
  const [runError, setRunError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>(
    "Paste raw company or job text, review structured CRM fields, then save."
  );
  const [progress, setProgress] = useState(0);
  const [gmailCandidates, setGmailCandidates] = useState<Awaited<
    ReturnType<typeof api.gmailFindOpportunityCandidates>
  > | null>(null);
  const [gmailPageToken, setGmailPageToken] = useState<string | null>(null);
  const { data: options } = useQuery({
    queryKey: ["options"],
    queryFn: api.options,
  });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isBusy =
    runState === "validating_input" ||
    runState === "sending_to_api" ||
    runState === "extracting_fields" ||
    runState === "normalizing_result";

  const gmailStatus = useQuery({
    queryKey: ["gmail-status"],
    queryFn: api.gmailStatus,
  });

  const gmailConnect = useMutation({
    mutationFn: () => api.gmailConnect({ returnTo: "/parse" }),
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl;
    },
  });

  const gmailSearch = useMutation({
    mutationFn: (pageToken?: string | null) => api.gmailFindOpportunityCandidates(pageToken, 10),
    onSuccess: (result, pageToken) => {
      setGmailCandidates((current) => ({
        ...result,
        candidates: pageToken ? [...(current?.candidates ?? []), ...result.candidates] : result.candidates,
      }));
      setGmailPageToken(result.nextPageToken);
    },
  });

  const gmailParse = useMutation({
    mutationFn: api.gmailParseOpportunityCandidate,
    onSuccess: ({ parsed, email }) => {
      const emailText = [
        `Subject: ${email.subject}`,
        `From: ${email.fromRaw}`,
        email.plainText || email.htmlText || email.snippet,
      ]
        .filter(Boolean)
        .join("\n\n");
      setText(emailText);
      setParseResult(parsed);
      setRunState("completed");
      setProgress(100);
      setRunError(null);
      setStatusMessage("Parsed the selected Gmail message. Review the result before creating the opportunity.");
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!parseResult) throw new Error("Nothing parsed");
      const domainIds = [];
      for (const label of parseResult.company.domains) {
        const existing = options?.domains.find((item) => item.label.toLowerCase() === label.toLowerCase());
        const domain = existing ?? ((await api.addDomain(label)) as { id: string });
        domainIds.push(domain.id);
      }
      return api.createOpportunity({
        companyName: parseResult.companyName ?? "Unknown company",
        roleTitle: parseResult.roleTitle ?? "Software Engineer",
        pipelineType: parseResult.pipelineType ?? "POTENTIAL",
        status: parseResult.status ?? "RESEARCH_LEAD",
        priority: parseResult.prioritySuggestion ?? "MEDIUM",
        referrerOrConnection: parseResult.process.knownContact,
        source: "AI parsed job description",
        nextStep: parseResult.process.suggestedNextStep,
        notes: parseResult.rawImportantNotes.join("\n"),
        location: parseResult.company.location,
        funding: parseResult.company.funding,
        companyDescription: parseResult.company.companyDescription,
        productDescription: parseResult.company.productDescription,
        customersTraction: parseResult.company.customersTraction,
        techStack: parseResult.role.techStack.join(", "),
        backendFrontendSplit: parseResult.role.backendFrontendSplit,
        compensationNotes: parseResult.role.compensation,
        domainIds,
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      navigate(`/opportunities/${saved.slug}`);
    },
  });

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

  return (
    <>
      <PageIntro
        title="Parse Job Description"
        description="Paste raw company or job text, review structured CRM fields, then save."
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
            placeholder="Paste a long job or company description..."
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
            <LoadingButton
              className="btn btn-secondary"
              disabled={gmailSearch.isPending || gmailConnect.isPending || gmailParse.isPending}
              loading={gmailSearch.isPending}
              loadingLabel="Scanning Gmail..."
              icon="mail_search"
              onClick={() => {
                if (gmailStatus.data?.connected) {
                  gmailSearch.mutate(null);
                } else {
                  gmailConnect.mutate();
                }
              }}
            >
              Find opportunity from Gmail
            </LoadingButton>
            {runState === "failed" ? (
              <LoadingButton className="btn btn-secondary" icon="refresh" onClick={() => void runParser(text)}>
                Retry
              </LoadingButton>
            ) : null}
          </div>
          {gmailSearch.error || gmailParse.error ? (
            <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
              {gmailSearch.error instanceof Error
                ? gmailSearch.error.message
                : gmailParse.error instanceof Error
                  ? gmailParse.error.message
                  : "Gmail scan failed."}
            </div>
          ) : null}
          {gmailCandidates ? (
            <div className="mt-5 rounded-xl border border-outline-variant bg-surface-container-low p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-body-md text-body-md font-semibold">Gmail opportunity candidates</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Pick the email that looks like a recruiter, founder, or job opportunity message.
                  </p>
                </div>
                {gmailPageToken ? (
                  <LoadingButton
                    className="btn btn-secondary btn-sm"
                    loading={gmailSearch.isPending}
                    loadingLabel="Loading..."
                    icon="expand_more"
                    onClick={() => gmailSearch.mutate(gmailPageToken)}
                  >
                    More
                  </LoadingButton>
                ) : null}
              </div>
              <div className="max-h-[360px] space-y-3 overflow-auto">
                {gmailCandidates.candidates.length > 0 ? (
                  gmailCandidates.candidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={gmailParse.isPending}
                      onClick={() => gmailParse.mutate(candidate.id)}
                      className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-left transition hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-body-md text-body-md font-semibold">{candidate.subject}</p>
                          <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">{candidate.from}</p>
                        </div>
                        <span className="shrink-0 font-body-xs text-body-xs text-on-surface-variant">
                          {new Date(candidate.date).toLocaleDateString()}
                        </span>
                      </div>
                      {candidate.snippet ? (
                        <p className="mt-2 line-clamp-2 font-body-sm text-body-sm text-on-surface-variant">
                          {candidate.snippet}
                        </p>
                      ) : null}
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-outline-variant p-6 text-center text-on-surface-variant">
                    No matching Gmail messages found.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </section>
        <section className="panel p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-bold">Review Parsed Data</h3>
            {parseResult ? (
              <LoadingButton
                className="btn btn-primary"
                loading={create.isPending}
                loadingLabel="Creating..."
                icon="add"
                onClick={() => create.mutate()}
              >
                Create opportunity
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
          {parseResult ? (
            <pre className="max-h-[420px] overflow-auto rounded-lg bg-surface-container-low p-4 font-geist text-xs text-on-surface-variant">
              {JSON.stringify(parseResult, null, 2)}
            </pre>
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
