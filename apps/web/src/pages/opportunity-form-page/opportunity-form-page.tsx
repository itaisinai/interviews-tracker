import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../../components/app-layout";
import { api } from "../../lib/api";

import { ReviewPanel } from "./components/review-panel";
import { SourcePanel } from "./components/source-panel";
import { useGmailFilter } from "./hooks/use-gmail-filter";
import { useParser } from "./hooks/use-parser";
import type { GmailCandidatesResult, SourceMode } from "./types";
import { findMatchingOption, normalizeJobStatus, normalizeLookupValue } from "./utils";

export function OpportunityFormPage() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("raw-text");
  const [text, setText] = useState("");
  const [gmailCandidates, setGmailCandidates] = useState<GmailCandidatesResult | null>(null);
  const [gmailPageToken, setGmailPageToken] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [showAllEmails, setShowAllEmails] = useState(false);
  const [daysBack, setDaysBack] = useState(7);

  const {
    parseResult,
    setParseResult,
    runState,
    setRunState,
    statusMessage,
    setStatusMessage,
    progress,
    setProgress,
    isBusy,
    runParser,
  } = useParser();

  const {
    data: options,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({ queryKey: ["options"], queryFn: api.options });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const gmailStatus = useQuery({
    queryKey: ["gmail-status"],
    queryFn: api.gmailStatus,
  });

  const gmailConnect = useMutation({
    mutationFn: () => api.gmailConnect({ returnTo: "/opportunities/new" }),
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl;
    },
  });

  const gmailSearch = useMutation({
    mutationFn: (pageToken?: string | null) =>
      api.gmailFindOpportunityCandidates(pageToken, 50, showAllEmails, daysBack),
    onSuccess: (result, pageToken) => {
      setGmailCandidates((current) => ({
        ...result,
        candidates: pageToken ? [...(current?.candidates ?? []), ...result.candidates] : result.candidates,
      }));
      setGmailPageToken(result.nextPageToken);
    },
    onError: () => {
      // Invalidate gmailStatus to refresh connection state (e.g., after token expiry)
      queryClient.invalidateQueries({ queryKey: ["gmail-status"] });
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
      setStatusMessage("Parsed the selected Gmail message. Review the result before creating the opportunity.");
    },
  });

  const { groupedCandidates, filteredCandidates, emailDateRange, groupedEmailIds } = useGmailFilter(gmailCandidates);

  const companySizeOption = findMatchingOption(options?.companySizes, parseResult?.company?.employees);
  const companyStageOption = findMatchingOption(options?.companyStages, parseResult?.company?.stage);
  const workModelOption = findMatchingOption(options?.workModels, parseResult?.company?.workModel);
  const parsedDomains = useMemo(() => {
    const raw = parseResult?.company?.domains ?? [];
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

      // Auto-create domains if not found
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

      // Auto-create company size option if not found
      let employeesRangeId = companySizeOption?.id;
      if (!employeesRangeId && parseResult.company.employees?.trim()) {
        const created = (await api.addOption("company-size", parseResult.company.employees.trim())) as {
          id: string;
        };
        employeesRangeId = created.id;
      }

      // Auto-create company stage option if not found
      let companyStageId = companyStageOption?.id;
      if (!companyStageId && parseResult.company.stage?.trim()) {
        const created = (await api.addOption("company-stage", parseResult.company.stage.trim())) as { id: string };
        companyStageId = created.id;
      }

      // Auto-create work model option if not found
      let workModelId = workModelOption?.id;
      if (!workModelId && parseResult.company.workModel?.trim()) {
        const created = (await api.addOption("work-model", parseResult.company.workModel.trim())) as { id: string };
        workModelId = created.id;
      }

      return api.createOpportunity({
        companyName,
        roleTitle,
        pipelineType: parseResult.pipelineType ?? "POTENTIAL",
        status: normalizeJobStatus(parseResult.status),
        referrerOrConnection: parseResult.process.knownContact,
        source: "AI parsed job description",
        nextStep: parseResult.process.suggestedNextStep,
        notes: parseResult.rawImportantNotes.join("\n"),
        employeesRangeId,
        companyStageId,
        workModelId,
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

  if (isLoading) {
    return <PageLoadingState title="New Opportunity" description="Loading option lists for the review step." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="New Opportunity"
        description={error instanceof Error ? error.message : "Unable to load opportunity options."}
        onRetry={() => void refetch()}
      />
    );
  }

  const canSave = Boolean(parseResult?.companyName?.trim() && parseResult?.roleTitle?.trim() && !create.isPending);

  return (
    <>
      <PageIntro
        title="New Opportunity"
        description="Choose how you want to add the opportunity - paste raw text or search your Gmail."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SourcePanel
          sourceMode={sourceMode}
          setSourceMode={setSourceMode}
          text={text}
          setText={setText}
          gmailStatus={gmailStatus}
          gmailConnect={gmailConnect}
          gmailSearch={gmailSearch}
          gmailCandidates={gmailCandidates}
          setGmailCandidates={setGmailCandidates}
          filteredCandidates={filteredCandidates}
          groupedCandidates={groupedCandidates}
          groupedEmailIds={groupedEmailIds}
          emailDateRange={emailDateRange}
          gmailPageToken={gmailPageToken}
          expandedCompanies={expandedCompanies}
          setExpandedCompanies={setExpandedCompanies}
          selectedEmails={selectedEmails}
          setSelectedEmails={setSelectedEmails}
          showAllEmails={showAllEmails}
          setShowAllEmails={setShowAllEmails}
          daysBack={daysBack}
          setDaysBack={setDaysBack}
          onRefresh={() => {
            setGmailCandidates(null);
            gmailSearch.mutate(null);
          }}
        />

        <ReviewPanel
          sourceMode={sourceMode}
          isBusy={isBusy}
          runState={runState}
          statusMessage={statusMessage}
          progress={progress}
          runError={null}
          createError={create.error}
          parseResult={parseResult}
          companySizeOption={companySizeOption}
          companyStageOption={companyStageOption}
          workModelOption={workModelOption}
          parsedDomains={parsedDomains}
          canSave={canSave}
          onUpdateParseResult={(updates) => {
            if (parseResult) {
              setParseResult({ ...parseResult, ...updates });
            }
          }}
        />
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className="btn btn-secondary" onClick={() => navigate("/opportunities")}>
          Cancel
        </button>
        {sourceMode === "raw-text" ? (
          <Button
            className="btn btn-primary"
            disabled={!text.trim()}
            loading={isBusy}
            loadingLabel="Parsing..."
            leadingIcon="auto_awesome"
            onClick={() => void runParser(text)}
          >
            Parse Content
          </Button>
        ) : (
          <Button
            className="btn btn-primary"
            disabled={selectedEmails.size === 0}
            loading={gmailParse.isPending}
            loadingLabel="Adding..."
            leadingIcon="arrow_forward"
            onClick={() => {
              const messageIds = Array.from(selectedEmails);
              if (messageIds.length > 0) {
                // If single email, use existing single-message flow
                if (messageIds.length === 1) {
                  gmailParse.mutate(messageIds[0]);
                } else {
                  // For multiple emails, send array to backend
                  gmailParse.mutate(messageIds);
                }
              }
            }}
          >
            Add to Review ({selectedEmails.size})
          </Button>
        )}
        {parseResult ? (
          <Button
            className="btn btn-primary"
            loading={create.isPending}
            loadingLabel="Saving..."
            leadingIcon="save"
            disabled={!canSave}
            onClick={() => create.mutate()}
          >
            Save Opportunity
          </Button>
        ) : null}
      </div>
    </>
  );
}
