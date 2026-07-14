import { Button, InlineLoadingState, MaterialIcon, ProcessStateCard } from "@interviews-tracker/design-system";

import type { GmailFlowState } from "../../lib/gmail";
import { type GmailSearchCandidate } from "../../lib/types";
import { Badge } from "../badge";

import type { TrackedGmailEmail } from "./gmail-interaction-panel-helpers";

type GmailWorkspaceProps = {
  companyName: string;
  roleTitle: string;
  connected: boolean;
  configured: boolean;
  shouldReconnect: boolean;
  statusFetching: boolean;
  flowState: GmailFlowState;
  currentLabel: string;
  currentTone: "neutral" | "busy" | "success" | "danger";
  message: string;
  progress: number;
  error: string | null;
  needsReconnect: boolean;
  searchResults: GmailSearchCandidate[];
  selectedCandidateId: string | null;
  isParsingCandidateId: string | null;
  actionDisabled: boolean;
  clearingEmailId: string | null;
  removedEmails: TrackedGmailEmail[];
  pickedEmails: TrackedGmailEmail[];
  ignoredEmails: TrackedGmailEmail[];
  removedEmailsExpanded: boolean;
  ignoredEmailsExpanded: boolean;
  pendingPickedEmailIds: Set<string>;
  gmailMessageStatesFetching: boolean;
  ignoringEmailId: string | null;
  onConnect: () => void;
  onSearch: () => void;
  onRetry: () => void;
  onParseEmail: (email: GmailSearchCandidate) => void;
  onClearEmail: (email: GmailSearchCandidate) => void;
  onIgnoreEmail: (email: GmailSearchCandidate) => void;
  onRestoreEmail: (email: TrackedGmailEmail) => void;
  onUnignoreEmail: (email: TrackedGmailEmail) => void;
  onUnpickEmail: (email: TrackedGmailEmail) => void;
  onRemovedEmailsExpandedChange: (value: boolean) => void;
  onIgnoredEmailsExpandedChange: (value: boolean) => void;
};

export function GmailWorkspace({
  companyName,
  roleTitle,
  connected,
  configured,
  shouldReconnect,
  statusFetching,
  flowState,
  currentLabel,
  currentTone,
  message,
  progress,
  error,
  needsReconnect,
  searchResults,
  selectedCandidateId,
  isParsingCandidateId,
  actionDisabled,
  clearingEmailId,
  removedEmails,
  pickedEmails,
  ignoredEmails,
  removedEmailsExpanded,
  ignoredEmailsExpanded,
  pendingPickedEmailIds,
  gmailMessageStatesFetching,
  ignoringEmailId,
  onConnect,
  onSearch,
  onRetry,
  onParseEmail,
  onClearEmail,
  onIgnoreEmail,
  onRestoreEmail,
  onUnignoreEmail,
  onUnpickEmail,
  onRemovedEmailsExpandedChange,
  onIgnoredEmailsExpandedChange,
}: GmailWorkspaceProps) {
  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MaterialIcon name="mail" />
            </div>
            <div>
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Gmail interaction</p>
              <h3 className="font-title-md text-title-md font-bold">{companyName}</h3>
            </div>
          </div>
          <p className="mt-3 max-w-3xl text-body-md text-on-surface-variant">
            Search recent Gmail threads for this company, parse one email with AI, and review it before saving as an
            interaction.
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">{roleTitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {statusFetching ? <InlineLoadingState label="Refreshing" /> : null}
          {connected ? (
            <>
              <span className="rounded-full bg-primary-container px-3 py-1 text-label-md text-on-primary-container">
                Gmail connected
              </span>
              <Button
                className="btn btn-primary"
                loading={flowState === "searching_emails"}
                loadingLabel="Searching..."
                leadingIcon="search"
                onClick={onSearch}
              >
                Add interaction from Gmail
              </Button>
            </>
          ) : configured ? (
            <Button
              className="btn btn-primary"
              loading={flowState === "connecting_gmail"}
              loadingLabel="Connecting..."
              leadingIcon="link"
              onClick={onConnect}
            >
              {shouldReconnect ? "Reconnect Gmail" : "Connect Gmail"}
            </Button>
          ) : (
            <div className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-body-md text-on-error-container">
              Gmail OAuth is not configured on this environment.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <ProcessStateCard
          title="Gmail flow"
          message={currentLabel}
          description={message}
          tone={flowState === "failed" ? "danger" : currentTone}
          progress={progress}
        />
      </div>

      {error && flowState === "failed" ? (
        <div className="mt-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Gmail action failed</p>
          <p className="mt-1 font-body-md text-body-md">{error}</p>
          <div className="mt-3">
            {needsReconnect ? (
              <Button className="btn btn-primary" loading={false} leadingIcon="link" onClick={onConnect}>
                Reconnect Gmail
              </Button>
            ) : (
              <Button className="btn btn-secondary" loading={false} leadingIcon="refresh" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        </div>
      ) : null}

      {connected ? (
        <div className="mt-6">
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-label-md text-label-md uppercase text-on-surface-variant">Candidate emails</p>
                <Button
                  className="font-label-md text-label-md text-primary hover:underline"
                  disabled={Boolean(selectedCandidateId)}
                  loading={flowState === "searching_emails"}
                  loadingLabel="Searching..."
                  leadingIcon="search"
                  onClick={onSearch}
                >
                  Search again
                </Button>
              </div>
              {searchResults.map((email) => {
                const isSelected = selectedCandidateId === email.id;
                const isParsing =
                  isSelected &&
                  flowState !== "idle" &&
                  flowState !== "failed" &&
                  flowState !== "ready_for_review" &&
                  isParsingCandidateId === email.id;

                return (
                  <div
                    key={email.id}
                    className={`rounded-xl border p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : "border-outline-variant bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-on-background">{email.subject}</p>
                        <p className="mt-1 text-body-md text-on-surface-variant">{email.from}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <p className="text-body-md text-on-surface-variant">{new Date(email.date).toLocaleString()}</p>
                        <Button
                          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                          disabled={actionDisabled}
                          loading={ignoringEmailId === email.id}
                          loadingLabel=""
                          leadingIcon="block"
                          onClick={() => onIgnoreEmail(email)}
                          title="Ignore this email permanently"
                        >
                          <span className="sr-only">Ignore email</span>
                        </Button>
                        <Button
                          className="rounded-full p-2 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-50"
                          disabled={actionDisabled}
                          loading={clearingEmailId === email.id}
                          loadingLabel=""
                          leadingIcon="delete"
                          onClick={() => onClearEmail(email)}
                        >
                          <span className="sr-only">Clear email</span>
                        </Button>
                      </div>
                    </div>
                    <p className="mt-3 text-body-md text-on-surface-variant">{email.snippet}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-label-sm ${email.relevance.isRelevant ? "bg-primary-container text-on-primary-container" : "bg-surface-container-low text-on-surface-variant"}`}
                      >
                        {email.relevance.emailType}
                      </span>
                      <span className="rounded-full bg-surface-container-low px-3 py-1 text-label-sm text-on-surface-variant">
                        Confidence {Math.round(email.relevance.confidence * 100)}%
                      </span>
                    </div>
                    <p className="mt-2 text-body-sm text-on-surface-variant">{email.relevance.reason}</p>
                    {isParsing ? (
                      <div className="mt-3">
                        <InlineLoadingState label={flowState === "fetching_email" ? "Fetching" : "Parsing"} />
                      </div>
                    ) : null}
                    <div className="mt-4 flex justify-end">
                      <Button
                        className="btn btn-primary"
                        disabled={actionDisabled}
                        loading={isParsing}
                        loadingLabel="Parsing..."
                        leadingIcon="auto_awesome"
                        onClick={() => onParseEmail(email)}
                      >
                        Parse email
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : flowState === "idle" && connected ? (
            <div className="rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
              No candidate emails loaded yet. Search Gmail to start.
            </div>
          ) : null}
          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Removed emails</p>
              <div className="flex items-center gap-2">
                {gmailMessageStatesFetching ? <InlineLoadingState label="Refreshing" /> : null}
                <Button variant="secondary" onClick={() => onRemovedEmailsExpandedChange(!removedEmailsExpanded)}>
                  <MaterialIcon name={removedEmailsExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
                  {removedEmailsExpanded ? "Hide" : `Show (${removedEmails.length})`}
                </Button>
              </div>
            </div>
            {removedEmailsExpanded ? (
              removedEmails.length > 0 ? (
                <div className="mt-3 divide-y divide-outline-variant">
                  {removedEmails.map((email) => (
                    <div key={email.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-semibold text-on-background">
                          {email.subject}
                        </p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {new Date(email.date).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        className="btn btn-secondary"
                        loading={clearingEmailId === email.id}
                        loadingLabel="Restoring..."
                        leadingIcon="undo"
                        onClick={() => onRestoreEmail(email)}
                      >
                        Undo
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-body-md text-on-surface-variant">No removed emails.</p>
              )
            ) : (
              <p className="mt-3 text-body-md text-on-surface-variant">Removed emails are hidden by default.</p>
            )}
          </div>
          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Picked emails</p>
              {gmailMessageStatesFetching ? <InlineLoadingState label="Refreshing" /> : null}
            </div>
            {pickedEmails.length > 0 ? (
              <div className="mt-3 divide-y divide-outline-variant">
                {pickedEmails.map((email) => (
                  <div key={email.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-body-md text-body-md font-semibold text-on-background">
                        {pendingPickedEmailIds.has(email.id) ? (
                          <Badge value="Pending" tone="warning" className="mr-2">
                            Pending
                          </Badge>
                        ) : null}
                        {email.subject}
                      </p>
                      <p className="mt-1 text-body-sm text-on-surface-variant">
                        {new Date(email.date).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-container px-3 py-1 text-label-sm text-on-primary-container">
                        Picked
                      </span>
                      <Button
                        className="btn btn-secondary"
                        loading={clearingEmailId === email.id}
                        loadingLabel="Removing..."
                        leadingIcon="delete"
                        onClick={() => onUnpickEmail(email)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-body-md text-on-surface-variant">No picked emails.</p>
            )}
          </div>
          <div className="mt-5 rounded-xl border border-outline-variant bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-label-md text-label-md uppercase text-on-surface-variant">Ignored emails</p>
              <div className="flex items-center gap-2">
                {gmailMessageStatesFetching ? <InlineLoadingState label="Refreshing" /> : null}
                <Button variant="secondary" onClick={() => onIgnoredEmailsExpandedChange(!ignoredEmailsExpanded)}>
                  <MaterialIcon name={ignoredEmailsExpanded ? "keyboard_arrow_up" : "keyboard_arrow_down"} />
                  {ignoredEmailsExpanded ? "Hide" : `Show (${ignoredEmails.length})`}
                </Button>
              </div>
            </div>
            {ignoredEmailsExpanded ? (
              ignoredEmails.length > 0 ? (
                <div className="mt-3 divide-y divide-outline-variant">
                  {ignoredEmails.map((email) => (
                    <div key={email.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-body-md text-body-md font-semibold text-on-surface-variant line-through">
                          {email.subject}
                        </p>
                        <p className="mt-1 text-body-sm text-on-surface-variant">
                          {new Date(email.date).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        className="btn btn-secondary"
                        loading={ignoringEmailId === email.id}
                        loadingLabel="Unignoring..."
                        leadingIcon="undo"
                        onClick={() => onUnignoreEmail(email)}
                      >
                        Unignore
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-body-md text-on-surface-variant">No ignored emails.</p>
              )
            ) : (
              <p className="mt-3 text-body-md text-on-surface-variant">Ignored emails are hidden by default.</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
