import { useState } from "react";

import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";

import { IconLink, LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

import { api } from "../../../lib/api";
import type { GmailSearchCandidate, GmailSearchResponse, GmailStatus } from "../../../lib/types";
import type { GmailCandidatesResult, SourceMode } from "../types";
import { formatDate } from "../utils";

function StatusBadge({ status }: { status: "USED" | "HIDDEN" | "IGNORED" }) {
  const styles = {
    USED: "bg-surface-container-high text-on-surface-variant",
    HIDDEN: "bg-error-container text-on-error-container",
    IGNORED: "bg-warning-container text-on-warning-container",
  };

  const labels = {
    USED: "Used",
    HIDDEN: "Hidden",
    IGNORED: "Ignored",
  };

  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}

interface SourcePanelProps {
  sourceMode: SourceMode;
  setSourceMode: (mode: SourceMode) => void;
  text: string;
  setText: (text: string) => void;
  gmailStatus: UseQueryResult<GmailStatus>;
  gmailConnect: UseMutationResult<{ authUrl: string }, Error, void>;
  gmailSearch: UseMutationResult<GmailSearchResponse, Error, string | null | undefined>;
  gmailCandidates: GmailCandidatesResult | null;
  filteredCandidates: GmailSearchCandidate[];
  groupedCandidates: Map<string, GmailSearchCandidate[]>;
  emailDateRange: { oldest: string; newest: string } | null;
  gmailPageToken: string | null;
  expandedCompanies: Set<string>;
  setExpandedCompanies: (companies: Set<string>) => void;
  selectedEmails: Set<string>;
  setSelectedEmails: (emails: Set<string>) => void;
  showAllEmails: boolean;
  setShowAllEmails: (show: boolean) => void;
  onRefresh: () => void;
}

export function SourcePanel({
  sourceMode,
  setSourceMode,
  text,
  setText,
  gmailStatus,
  gmailConnect,
  gmailSearch,
  gmailCandidates,
  filteredCandidates,
  groupedCandidates,
  emailDateRange,
  gmailPageToken,
  expandedCompanies,
  setExpandedCompanies,
  selectedEmails,
  setSelectedEmails,
  showAllEmails,
  setShowAllEmails,
  onRefresh,
}: SourcePanelProps) {
  const [restoringMessageId, setRestoringMessageId] = useState<string | null>(null);

  const restoreMutation = useMutation({
    mutationFn: (messageId: string) => api.gmailRestoreMessage(messageId),
    onSuccess: (_, messageId) => {
      console.log(`Restored message ${messageId}`);
      setRestoringMessageId(null);
      onRefresh();
    },
    onError: (error, messageId) => {
      console.error(`Failed to restore message ${messageId}:`, error);
      setRestoringMessageId(null);
    },
  });

  const handleRestore = (messageId: string) => {
    setRestoringMessageId(messageId);
    restoreMutation.mutate(messageId);
  };

  return (
    <section className="panel p-6">
      <div className="mb-4">
        <h3 className="font-title-lg text-title-lg font-bold">Source</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">Choose how you want to add the opportunity.</p>
      </div>

      {/* Tabs: Raw Text / Search Gmail */}
      <div className="mb-6 flex gap-2 border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setSourceMode("raw-text")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition ${
            sourceMode === "raw-text"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <MaterialIcon name="description" />
          Raw Text
        </button>
        <button
          type="button"
          onClick={() => {
            setSourceMode("search-gmail");
            if (!gmailCandidates && gmailStatus.data?.connected) {
              gmailSearch.mutate(null);
            }
          }}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 font-medium transition ${
            sourceMode === "search-gmail"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <MaterialIcon name="mail" />
          Search Gmail
        </button>
      </div>

      {/* Raw Text Tab Content */}
      {sourceMode === "raw-text" ? (
        <div>
          <p className="mb-3 text-body-sm text-on-surface-variant">Paste a job post or recruiter message below.</p>
          <textarea
            className="w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 min-h-[200px]"
            style={{ resize: "vertical" }}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Paste the content here..."
          />
          <p className="mt-2 text-body-xs text-on-surface-variant">
            Tip: Include as much of the message or job post as possible.
          </p>
        </div>
      ) : (
        /* Search Gmail Tab Content */
        <div>
          <p className="mb-3 text-body-sm text-on-surface-variant">Search your emails and select the relevant ones</p>

          {!gmailStatus.data?.connected ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
              <MaterialIcon name="mail" className="mb-4 text-5xl text-on-surface-variant" />
              <p className="mb-4 font-title-md text-title-md font-medium text-on-surface">Connect your Gmail account</p>
              <LoadingButton
                className="btn btn-primary"
                loading={gmailConnect.isPending}
                loadingLabel="Connecting..."
                icon="link"
                onClick={() => gmailConnect.mutate()}
              >
                Connect Gmail
              </LoadingButton>
            </div>
          ) : gmailSearch.isPending && !gmailCandidates ? (
            <div className="flex min-h-[300px] items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low">
              <div className="text-center">
                <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-body-sm text-on-surface-variant">Searching Gmail...</p>
                <p className="mt-2 text-body-xs text-on-surface-variant">Looking for emails from the last 6 months</p>
              </div>
            </div>
          ) : filteredCandidates.length > 0 ? (
            <>
              {emailDateRange ? (
                <div className="mb-3 flex items-center justify-between gap-2 text-body-sm text-on-surface-variant">
                  <span>
                    Showing emails from {emailDateRange.oldest} to {emailDateRange.newest}
                  </span>
                  <div className="flex items-center gap-2">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showAllEmails}
                        onChange={(e) => {
                          setShowAllEmails(e.target.checked);
                          onRefresh();
                        }}
                        className="h-4 w-4 rounded border-outline-variant"
                      />
                      <span className="text-body-sm font-medium">Show All</span>
                    </label>
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
                </div>
              ) : null}

              {/* Email list with grouped companies */}
              <div className="max-h-[400px] space-y-3 overflow-auto">
                {Array.from(groupedCandidates.entries())
                  .filter(([, candidates]) => candidates.length > 1)
                  .sort((a, b) => b[1].length - a[1].length)
                  .map(([companyKey, candidates]) => {
                    const isExpanded = expandedCompanies.has(companyKey);
                    const displayName = companyKey.charAt(0).toUpperCase() + companyKey.slice(1);

                    return (
                      <div
                        key={companyKey}
                        className="rounded-lg border border-outline-variant bg-surface-container-low"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            const newExpanded = new Set(expandedCompanies);
                            if (isExpanded) {
                              newExpanded.delete(companyKey);
                            } else {
                              newExpanded.add(companyKey);
                            }
                            setExpandedCompanies(newExpanded);
                          }}
                          className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface-container"
                        >
                          <MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} />
                          <div className="flex-1">
                            <p className="font-body-md font-semibold">{displayName}</p>
                            <p className="text-body-sm text-on-surface-variant">{candidates.length} emails</p>
                          </div>
                          <span className="rounded-full bg-on-surface/10 px-2 py-1 text-xs">{candidates.length}</span>
                        </button>

                        {isExpanded ? (
                          <div className="space-y-2 border-t border-outline-variant p-2">
                            {candidates.map((candidate) => (
                              <label
                                key={candidate.id}
                                className="flex cursor-pointer gap-3 rounded-lg p-2 hover:bg-surface-container"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedEmails.has(candidate.id)}
                                  onChange={(e) => {
                                    const newSelected = new Set(selectedEmails);
                                    if (e.target.checked) {
                                      newSelected.add(candidate.id);
                                    } else {
                                      newSelected.delete(candidate.id);
                                    }
                                    setSelectedEmails(newSelected);
                                  }}
                                  className="mt-1"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="line-clamp-1 text-body-sm font-medium">{candidate.subject}</p>
                                    {candidate.suppressionStatus ? (
                                      <StatusBadge status={candidate.suppressionStatus} />
                                    ) : null}
                                  </div>
                                  <p className="text-body-xs text-on-surface-variant">{candidate.from}</p>
                                  {candidate.snippet ? (
                                    <p className="mt-1 line-clamp-2 text-body-xs text-on-surface-variant">
                                      {candidate.snippet}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span className="text-body-xs text-on-surface-variant">
                                    {formatDate(new Date(candidate.date))}
                                  </span>
                                  {candidate.suppressionStatus === "USED" && candidate.usedInOpportunitySlug ? (
                                    <IconLink
                                      href={`/opportunities/${candidate.usedInOpportunitySlug}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Opportunity
                                    </IconLink>
                                  ) : candidate.suppressionStatus ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleRestore(candidate.id);
                                      }}
                                      disabled={restoringMessageId === candidate.id}
                                      className="flex items-center gap-1 whitespace-nowrap text-xs text-primary hover:underline disabled:opacity-50"
                                    >
                                      <MaterialIcon name="refresh" className="text-sm" />
                                      {restoringMessageId === candidate.id ? "Restoring..." : "Restore"}
                                    </button>
                                  ) : null}
                                </div>
                              </label>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                {/* Single emails (not grouped) - only show emails NOT in groups with 2+ */}
                {filteredCandidates
                  .filter((candidate) => {
                    // Use the SAME logic as grouping to determine companyKey
                    const emailMatch = candidate.from.match(/<([^>]+)>|([^\s<]+@[^\s>]+)/);
                    const email = emailMatch?.[1] || emailMatch?.[2] || candidate.from;
                    const domain = email.split("@")[1]?.toLowerCase() || "";
                    let companyKey = domain.split(".")[0] || domain;

                    // Try to extract company from subject line as well (same as grouping logic)
                    const subjectMatch = candidate.subject.match(/at\s+(\w+)|@\s+(\w+)|with\s+(\w+)/i);
                    if (subjectMatch) {
                      const subjectCompany = (subjectMatch[1] || subjectMatch[2] || subjectMatch[3])?.toLowerCase();
                      if (subjectCompany && subjectCompany.length > 2) {
                        companyKey = subjectCompany;
                      }
                    }

                    const grouped = groupedCandidates.get(companyKey);
                    // Only show if NOT in a group with 2+ emails (those are shown in the grouped section above)
                    return !grouped || grouped.length <= 1;
                  })
                  .map((candidate) => (
                    <label
                      key={candidate.id}
                      className="flex cursor-pointer gap-3 rounded-lg border border-outline-variant bg-surface p-3 hover:border-primary"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmails.has(candidate.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedEmails);
                          if (e.target.checked) {
                            newSelected.add(candidate.id);
                          } else {
                            newSelected.delete(candidate.id);
                          }
                          setSelectedEmails(newSelected);
                        }}
                        className="mt-1"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="line-clamp-2 font-body-sm font-semibold">{candidate.subject}</p>
                          {candidate.suppressionStatus ? <StatusBadge status={candidate.suppressionStatus} /> : null}
                        </div>
                        <p className="mt-1 text-body-xs text-on-surface-variant">{candidate.from}</p>
                        {candidate.snippet ? (
                          <p className="mt-2 line-clamp-2 text-body-xs text-on-surface-variant">{candidate.snippet}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-body-xs text-on-surface-variant">
                          {formatDate(new Date(candidate.date))}
                        </span>
                        {candidate.suppressionStatus === "USED" && candidate.usedInOpportunitySlug ? (
                          <IconLink
                            href={`/opportunities/${candidate.usedInOpportunitySlug}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View Opportunity
                          </IconLink>
                        ) : candidate.suppressionStatus ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRestore(candidate.id);
                            }}
                            disabled={restoringMessageId === candidate.id}
                            className="flex items-center gap-1 text-xs text-primary hover:underline disabled:opacity-50"
                          >
                            <MaterialIcon name="refresh" className="text-sm" />
                            {restoringMessageId === candidate.id ? "Restoring..." : "Restore"}
                          </button>
                        ) : null}
                      </div>
                    </label>
                  ))}
              </div>

              <div className="mt-3 flex items-center gap-2 text-body-sm text-on-surface-variant">
                <MaterialIcon name="lightbulb" className="text-warning" />
                <span>Select one or more emails to add their content.</span>
              </div>
            </>
          ) : (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
              <MaterialIcon name="inbox" className="mb-4 text-5xl text-on-surface-variant" />
              <p className="mb-2 font-title-md text-title-md font-medium text-on-surface">No emails found</p>
              <p className="text-body-sm text-on-surface-variant">
                No job opportunity emails found in the last 6 months.
              </p>
            </div>
          )}

          {gmailSearch.error ? (
            <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
              {gmailSearch.error instanceof Error ? gmailSearch.error.message : "Gmail scan failed."}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
