import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { InteractionsDrawer } from "../components/interactions-drawer";
import { CompanyDataSection, OpportunitySidePanel } from "../components/opportunity-detail";
import { PageIntro } from "../components/app-shell";
import { Timeline } from "../components/timeline";
import { ContactsList } from "../components/contacts/contacts-list";
import { api } from "../lib/api";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import { InlineLoadingState, LoadingButton, MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

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
  const [showResearch, setShowResearch] = useState(false);
  const [showGmailImport, setShowGmailImport] = useState(false);

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

      <CompanyDataSection
        opportunity={data}
        showResearch={showResearch}
        showGmailImport={showGmailImport}
        onToggleResearch={() => setShowResearch((value) => !value)}
        onToggleGmailImport={() => setShowGmailImport((value) => !value)}
        onSaved={refresh}
      />

      <div className="mt-8">
        <ContactsList opportunityId={opportunityId} companyName={data.companyName} />
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

        <OpportunitySidePanel
          opportunity={data}
          note={note}
          task={task}
          compensation={comp}
          onNoteChange={setNote}
          onTaskChange={setTask}
          onCompensationChange={setComp}
          onAddNote={() => addNote.mutate()}
          onAddTask={() => addTask.mutate()}
          onSaveCompensation={() => saveComp.mutate()}
          onDeleteNote={(item) => {
            if (window.confirm("Delete this note?")) deleteNote.mutate(item.id);
          }}
          onDeleteTask={(item) => {
            if (window.confirm("Delete this task?")) deleteTask.mutate(item.id);
          }}
          onDeleteCompensation={(item) => {
            if (window.confirm("Delete compensation details?"))
              deleteCompensation.mutate(item.id);
          }}
          addingNote={addNote.isPending}
          addingTask={addTask.isPending}
          savingCompensation={saveComp.isPending}
          deletingNoteId={deleteNote.variables}
          deletingTaskId={deleteTask.variables}
          deletingCompensation={deleteCompensation.isPending}
        />
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={data ? { ...data, interactions: displayedInteractions } : null}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}
