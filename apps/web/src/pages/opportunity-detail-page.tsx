import {
  InlineLoadingState,
  LoadingButton,
  PageErrorState,
  PageLoadingState,
} from "../components/loading-state";
import { Link, useNavigate, useParams } from "react-router-dom";
import { labelForPipelineType, offerStatusOptions } from "../lib/enum-labels";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "../components/badge";
import { CompanyResearchPanel } from "../components/company-research-panel";
import { GmailInteractionPanel } from "../components/gmail-interaction-panel";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { Timeline } from "../components/timeline";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";

export function OpportunityDetailPage() {
  const { slugOrId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["opportunity", slugOrId],
    queryFn: () => api.opportunity(slugOrId),
    enabled: Boolean(slugOrId),
  });
  const [note, setNote] = useState({
    title: "",
    category: "General",
    content: "",
  });
  const [task, setTask] = useState({
    title: "",
    status: "PENDING",
    priority: "MEDIUM",
    dueDate: "",
    notes: "",
  });
  const [comp, setComp] = useState({
    baseSalary: "",
    equity: "",
    bonus: "",
    offerStatus: "NOT_DISCUSSED",
    negotiationNotes: "",
  });

  const opportunityId = data?.id ?? slugOrId;
  const canonicalSlug = data?.slug ?? null;
  const [selectedInteractionId, setSelectedInteractionId] = useState<
    string | null
  >(null);
  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["opportunity", slugOrId] });
  const addNote = useMutation({
    mutationFn: () => api.createOpportunityNote(opportunityId, note),
    onSuccess: refresh,
  });
  const addTask = useMutation({
    mutationFn: () => api.createOpportunityTask(opportunityId, task),
    onSuccess: refresh,
  });
  const saveComp = useMutation({
    mutationFn: () =>
      api.upsertCompensation({ ...comp, jobOpportunityId: opportunityId }),
    onSuccess: refresh,
  });
  const deleteOpportunity = useMutation({
    mutationFn: () => api.deleteOpportunity(opportunityId),
    onSuccess: () => navigate("/opportunities"),
  });
  const deleteInteraction = useMutation({
    mutationFn: (interactionId: string) => api.deleteInteraction(interactionId),
    onSuccess: refresh,
  });
  const deleteNote = useMutation({
    mutationFn: (noteId: string) => api.deleteNote(noteId),
    onSuccess: refresh,
  });
  const deleteTask = useMutation({
    mutationFn: (taskId: string) => api.deleteTask(taskId),
    onSuccess: refresh,
  });
  const deleteCompensation = useMutation({
    mutationFn: (compensationId: string) =>
      api.deleteCompensation(compensationId),
    onSuccess: refresh,
  });

  const displayedInteractions = useMemo(
    () => (data ? promoteOverdueInteractionsForRead(data.interactions) : []),
    [data],
  );
  const selectedInteraction = useMemo(
    () =>
      displayedInteractions.find((item) => item.id === selectedInteractionId) ??
      null,
    [displayedInteractions, selectedInteractionId],
  );

  useEffect(() => {
    if (
      selectedInteractionId &&
      !displayedInteractions.some((item) => item.id === selectedInteractionId)
    ) {
      setSelectedInteractionId(null);
    }
  }, [displayedInteractions, selectedInteractionId]);

  useEffect(() => {
    if (canonicalSlug && canonicalSlug !== slugOrId) {
      navigate(`/opportunities/${canonicalSlug}`, { replace: true });
    }
  }, [canonicalSlug, navigate, slugOrId]);

  if (isLoading || !data) {
    return (
      <PageLoadingState
        title="Opportunity"
        description="Loading opportunity details, notes, and interaction history."
      />
    );
  }

  if (isError) {
    return (
      <PageErrorState
        title="Opportunity"
        description={
          error instanceof Error ? error.message : "Unable to load opportunity."
        }
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <PageIntro
        title={data.companyName}
        description={data.roleTitle}
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <LoadingButton
              className="btn btn-secondary text-error hover:bg-error-container"
              loading={deleteOpportunity.isPending}
              loadingLabel="Deleting..."
              icon="delete"
              onClick={() => {
                if (
                  window.confirm(
                    `Delete ${data.companyName} / ${data.roleTitle}? This also deletes its interactions, notes, tasks, and compensation.`,
                  )
                )
                  deleteOpportunity.mutate();
              }}
            >
              Delete
            </LoadingButton>
            <Link className="btn btn-primary" to="/opportunities">
              <MaterialIcon name="arrow_back" />
              Back to Pipeline
            </Link>
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-on-primary-container font-geist text-lg font-bold text-white">
          {initials(data.companyName)}
        </div>
        <Badge value={data.status} />
        <Badge value={data.priority} />
        <Badge value={data.pipelineType}>
          {labelForPipelineType(data.pipelineType)}
        </Badge>
      </div>

      <CompanyResearchPanel
        companyName={data.companyName}
        roleTitle={data.roleTitle}
        knownContext={`Status: ${data.status} · Pipeline: ${data.pipelineType} · Next step: ${data.nextStep ?? "None"}${data.notes ? ` · Notes: ${data.notes}` : ""}`}
        existingCompanyData={{
          companySearchName: data.companySearchName ?? null,
          funding: data.funding ?? null,
          customersTraction: data.customersTraction ?? null,
          companyDescription: data.companyDescription ?? null,
          productDescription: data.productDescription ?? null,
          location: data.location ?? null,
          employees: data.employeesRange?.label ?? null,
        }}
        targetOpportunityId={data.id}
      />

      <div className="mt-6">
        <GmailInteractionPanel
          opportunityId={data.id}
          companyName={data.companyName}
          roleTitle={data.roleTitle}
          onSaved={refresh}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">
            Company Details
          </h3>
          <Detail label="LinkedIn" value={data.linkedinUrl} />
          <Detail label="English Search Name" value={data.companySearchName} />
          <Detail label="Size" value={data.employeesRange?.label} />
          <Detail label="Stage" value={data.companyStage?.label} />
          <Detail
            label="Domains"
            value={data.domains.map((item) => item.domain.label).join(", ")}
          />
          <Detail label="Work Model" value={data.workModel?.label} />
          <Detail label="Location" value={data.location} />
          <Detail label="Funding" value={data.funding} />
          <Detail label="Company" value={data.companyDescription} />
          <Detail label="Product" value={data.productDescription} />
        </section>

        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">
            Role Details
          </h3>
          <div className="mt-4">
            <p className="label">Job Posting</p>
            {data.jobUrl ? (
              <a
                className="mt-1 inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:underline"
                href={data.jobUrl}
                target="_blank"
                rel="noreferrer"
              >
                <MaterialIcon name="open_in_new" className="text-[18px]" />
                Open job posting
              </a>
            ) : (
              <p className="mt-1 text-body-md text-on-surface-variant">-</p>
            )}
          </div>
          <Detail label="Tech Stack" value={data.techStack} />
          <Detail
            label="Backend / Frontend"
            value={data.backendFrontendSplit}
          />
          <Detail label="Traction" value={data.customersTraction} />
          <Detail label="Compensation Notes" value={data.compensationNotes} />
          <Detail label="General Notes" value={data.notes} />
        </section>

        <section className="panel p-6 lg:col-span-4">
          <h3 className="font-title-md text-title-md font-bold">Next Step</h3>
          <p className="mt-4 rounded-lg bg-surface-container-low p-4 text-body-md font-medium text-on-background">
            {data.nextStep ?? "No next step set."}
          </p>
        </section>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Timeline
          className="lg:col-span-7"
          interactions={displayedInteractions}
          selectedInteractionId={selectedInteractionId}
          onSelectInteraction={setSelectedInteractionId}
          onDeleteInteraction={(interactionId) => {
            if (window.confirm("Delete this interaction?")) {
              deleteInteraction.mutate(interactionId);
            }
          }}
          isDeletingInteraction={(interactionId) =>
            deleteInteraction.isPending &&
            deleteInteraction.variables === interactionId
          }
        />

        <aside className="space-y-6 lg:col-span-5">
          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">
              Add Note
            </h3>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <input
                className="input"
                value={note.title}
                onChange={(e) => setNote({ ...note, title: e.target.value })}
                placeholder="Note title"
              />
              <input
                className="input"
                value={note.category}
                onChange={(e) => setNote({ ...note, category: e.target.value })}
                placeholder="Category"
              />
              <textarea
                className="input col-span-2"
                value={note.content}
                onChange={(e) => setNote({ ...note, content: e.target.value })}
                placeholder="Note content"
              />
              <LoadingButton
                className="btn btn-secondary"
                loading={addNote.isPending}
                loadingLabel="Adding..."
                icon="note_add"
                onClick={() => addNote.mutate()}
              >
                Add note
              </LoadingButton>
            </div>
          </section>

          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">
              Tasks
            </h3>
            {data.tasks.map((item) => (
              <div
                key={item.id}
                className="mb-3 rounded-lg bg-surface-container-low p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge value={item.status} />
                    <LoadingButton
                      compact
                      aria-label="Delete task"
                      className="text-error"
                      icon="delete"
                      loading={
                        deleteTask.isPending && deleteTask.variables === item.id
                      }
                      onClick={() => {
                        if (window.confirm("Delete this task?"))
                          deleteTask.mutate(item.id);
                      }}
                    />
                  </div>
                </div>
                <p className="mt-1 text-body-md text-on-surface-variant">
                  {item.notes}
                </p>
              </div>
            ))}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <input
                className="input"
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                placeholder="Task title"
              />
              <input
                className="input"
                type="date"
                value={task.dueDate}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
              />
              <textarea
                className="input col-span-2"
                value={task.notes}
                onChange={(e) => setTask({ ...task, notes: e.target.value })}
                placeholder="Task notes"
              />
              <LoadingButton
                className="btn btn-secondary"
                loading={addTask.isPending}
                loadingLabel="Adding..."
                icon="assignment_add"
                onClick={() => addTask.mutate()}
              >
                Add task
              </LoadingButton>
            </div>
          </section>

          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">
              Notes
            </h3>
            {data.notesList
              .filter((item) => item.category !== "Company Research")
              .map((item) => (
                <div
                  key={item.id}
                  className="border-b border-outline-variant py-3 last:border-0"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{item.title}</p>
                    <LoadingButton
                      compact
                      aria-label="Delete note"
                      className="text-error"
                      icon="delete"
                      loading={
                        deleteNote.isPending && deleteNote.variables === item.id
                      }
                      onClick={() => {
                        if (window.confirm("Delete this note?"))
                          deleteNote.mutate(item.id);
                      }}
                    />
                  </div>
                  <p className="font-label-md text-label-md text-on-surface-variant">
                    {item.category}
                  </p>
                  <p className="mt-1 text-body-md">{item.content}</p>
                </div>
              ))}
          </section>

          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">
              Compensation
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="input"
                value={comp.baseSalary}
                onChange={(e) =>
                  setComp({ ...comp, baseSalary: e.target.value })
                }
                placeholder={data.compensation?.baseSalary ?? "Base salary"}
              />
              <input
                className="input"
                value={comp.equity}
                onChange={(e) => setComp({ ...comp, equity: e.target.value })}
                placeholder={data.compensation?.equity ?? "Equity"}
              />
              <input
                className="input"
                value={comp.bonus}
                onChange={(e) => setComp({ ...comp, bonus: e.target.value })}
                placeholder={data.compensation?.bonus ?? "Bonus"}
              />
              <select
                className="input"
                value={comp.offerStatus}
                onChange={(e) =>
                  setComp({ ...comp, offerStatus: e.target.value })
                }
              >
                {offerStatusOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <textarea
                className="input col-span-2"
                value={comp.negotiationNotes}
                onChange={(e) =>
                  setComp({ ...comp, negotiationNotes: e.target.value })
                }
                placeholder={
                  data.compensation?.negotiationNotes ?? "Negotiation notes"
                }
              />
              <LoadingButton
                className="btn btn-primary"
                loading={saveComp.isPending}
                loadingLabel="Saving..."
                icon="save"
                onClick={() => saveComp.mutate()}
              >
                Save compensation
              </LoadingButton>
              {data.compensation ? (
                <LoadingButton
                  className="btn btn-secondary text-error hover:bg-error-container"
                  loading={deleteCompensation.isPending}
                  loadingLabel="Deleting..."
                  icon="delete"
                  onClick={() => {
                    if (window.confirm("Delete compensation details?"))
                      deleteCompensation.mutate(data.compensation!.id);
                  }}
                >
                  Delete compensation
                </LoadingButton>
              ) : null}
            </div>
          </section>
        </aside>
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="mt-4">
      <p className="label">{label}</p>
      <p className="mt-1 text-body-md text-on-surface-variant">
        {value || "-"}
      </p>
    </div>
  );
}
