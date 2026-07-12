import { useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  InlineLoadingState,
  LoadingButton,
  MaterialIcon,
  PageErrorState,
  PageLoadingState,
} from "@interviews-tracker/design-system";

import { PageIntro } from "../components/app-layout";
import { api } from "../lib/api";
import type { GmailStatus, Option } from "../lib/types";

const lists = [
  ["Domains", "domain", "domains", "category"],
  ["Company sizes", "company-size", "companySizes", "groups"],
  ["Company stages", "company-stage", "companyStages", "rocket_launch"],
  ["Work models", "work-model", "workModels", "home_work"],
  ["Interaction types", "interaction-type", "interactionTypes", "forum"],
  ["Interview stages", "interview-stage", "interviewStages", "timeline"],
] as const;

export function SettingsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["options"],
    queryFn: api.options,
  });
  const gmailStatusQuery = useQuery({ queryKey: ["gmail-status"], queryFn: api.gmailStatus });
  const gmailConnected = gmailStatusQuery.data?.connected ?? false;

  if (isLoading) {
    return <PageLoadingState title="Settings" description="Loading domains, sizes, stages, and work models." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Settings"
        description={error instanceof Error ? error.message : "Unable to load settings."}
        onRetry={() => void refetch()}
      />
    );
  }
  return (
    <>
      <PageIntro
        title="Settings"
        description="Manage data options used by forms, filters, and parsed AI output."
        actions={isFetching ? <InlineLoadingState label="Refreshing" /> : undefined}
      />
      <GmailIntegrationCard
        status={gmailStatusQuery.data}
        isLoading={gmailStatusQuery.isLoading}
        isFetching={gmailStatusQuery.isFetching}
      />
      {gmailConnected && <IgnoredEmailsCard />}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {lists.map(([title, kind, key, icon]) => (
          <OptionList key={kind} title={title} kind={kind} icon={icon} items={(data?.[key] ?? []) as Option[]} />
        ))}
      </div>
    </>
  );
}

function OptionList({ title, kind, icon, items }: { title: string; kind: string; icon: string; items: Option[] }) {
  const [label, setLabel] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => (kind === "domain" ? api.addDomain(label) : api.addOption(kind, label)),
    onSuccess: () => {
      setLabel("");
      void queryClient.invalidateQueries({ queryKey: ["options"] });
    },
  });
  const deleteOption = useMutation({
    mutationFn: (id: string) => api.deleteOption(kind, id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["options"] }),
  });
  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <MaterialIcon name={icon} />
        </div>
        <h3 className="font-title-md text-title-md font-bold">{title}</h3>
      </div>
      <div className="flex gap-2">
        <input
          className="input bg-surface-container-low"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Add option"
        />
        <LoadingButton
          className="btn btn-primary"
          loading={mutation.isPending}
          loadingLabel="Adding..."
          onClick={() => mutation.mutate()}
          icon="add"
        >
          Add
        </LoadingButton>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant"
          >
            {item.label}
            <LoadingButton
              compact
              aria-label={`Delete option ${item.label}`}
              className="text-error"
              icon="close"
              loading={deleteOption.isPending && deleteOption.variables === item.id}
              onClick={() => {
                if (window.confirm(`Delete option "${item.label}"? Existing records will be detached from it.`))
                  deleteOption.mutate(item.id);
              }}
            />
          </span>
        ))}
      </div>
    </section>
  );
}

function formatGmailStatusTime(value?: string | null) {
  if (!value) {
    return "Never";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function GmailIntegrationCard({
  status,
  isLoading,
  isFetching,
}: {
  status?: GmailStatus;
  isLoading: boolean;
  isFetching: boolean;
}) {
  const queryClient = useQueryClient();
  const connect = useMutation({
    mutationFn: () => api.gmailConnect({ returnTo: "/settings" }),
    onSuccess: (response) => window.location.assign(response.authUrl),
  });
  const disconnect = useMutation({
    mutationFn: api.gmailDisconnect,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gmail-status"] }),
  });
  const connected = status?.connected ?? false;
  const needsReconnect = status?.needsReconnect ?? false;
  const configured = status?.configured ?? false;

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`rounded-lg p-2 ${needsReconnect ? "bg-error-container text-error" : connected ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}
          >
            <MaterialIcon name="mail" />
          </div>
          <div>
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">Integrations · Gmail</p>
            <h3 className="font-title-md text-title-md font-bold">
              {needsReconnect ? "🔴 Connection expired" : connected ? "🟢 Connected" : "Gmail not connected"}
            </h3>
            {connected ? (
              <p className="mt-1 text-body-md text-on-surface-variant">
                Last sync: {formatGmailStatusTime(status?.updatedAt)}
              </p>
            ) : needsReconnect ? (
              <p className="mt-1 text-body-md text-on-surface-variant">Google authorization has expired.</p>
            ) : (
              <p className="mt-1 text-body-md text-on-surface-variant">
                Connect Gmail to import recruiter and interview emails.
              </p>
            )}
            {status?.googleEmail ? (
              <p className="mt-1 text-body-sm text-on-surface-variant">Google account: {status.googleEmail}</p>
            ) : null}
            {status?.lastError ? <p className="mt-2 text-body-md text-error">{status.lastError}</p> : null}
            {!configured && !isLoading ? (
              <p className="mt-2 text-body-md text-error">Gmail OAuth is not configured on this environment.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isLoading || isFetching ? <InlineLoadingState label="Refreshing" /> : null}
          {configured ? (
            <>
              <LoadingButton
                className="btn btn-primary"
                loading={connect.isPending}
                loadingLabel="Opening..."
                icon="link"
                onClick={() => connect.mutate()}
              >
                {needsReconnect ? "Reconnect Gmail" : connected ? "Reconnect" : "Connect Gmail"}
              </LoadingButton>
              {connected ? (
                <LoadingButton
                  className="btn btn-secondary"
                  loading={disconnect.isPending}
                  loadingLabel="Disconnecting..."
                  icon="link_off"
                  onClick={() => {
                    if (window.confirm("Disconnect Gmail? You can reconnect later from Settings.")) disconnect.mutate();
                  }}
                >
                  Disconnect
                </LoadingButton>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function IgnoredEmailsCard() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["gmail-ignored-messages"],
    queryFn: api.gmailListIgnoredMessages,
  });

  const unignoreMutation = useMutation({
    mutationFn: (messageId: string) => api.gmailUnignoreGlobal(messageId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["gmail-ignored-messages"] }),
  });

  const ignoredEmails = data?.ignoredMessages ?? [];

  return (
    <section className="panel mt-6 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-surface-container-high p-2 text-on-surface-variant">
            <MaterialIcon name="block" />
          </div>
          <div>
            <h3 className="font-title-md text-title-md font-bold">Ignored Emails</h3>
            <p className="mt-1 text-body-md text-on-surface-variant">
              Permanently ignored emails won't appear in any Gmail import flow
            </p>
          </div>
        </div>
        {isFetching && <InlineLoadingState label="Refreshing" />}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <InlineLoadingState label="Loading ignored emails" />
        </div>
      ) : ignoredEmails.length === 0 ? (
        <div className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
          <MaterialIcon name="check_circle" className="mb-2 text-[48px] text-on-surface-variant" />
          <p className="text-body-md text-on-surface-variant">
            No ignored emails. You can ignore emails from any opportunity's Gmail import flow.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ignoredEmails.map((email) => (
            <div
              key={email.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-body-md text-body-md font-semibold text-on-surface-variant line-through">
                  {email.subject}
                </p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {new Date(email.date).toLocaleString()}
                  {email.opportunityId && " · Added from opportunity"}
                </p>
              </div>
              <LoadingButton
                className="btn btn-secondary"
                loading={unignoreMutation.isPending && unignoreMutation.variables === email.id}
                loadingLabel="Unignoring..."
                icon="undo"
                onClick={() => {
                  if (window.confirm(`Unignore "${email.subject}"? It will appear in future Gmail searches.`)) {
                    unignoreMutation.mutate(email.id);
                  }
                }}
              >
                Unignore
              </LoadingButton>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
