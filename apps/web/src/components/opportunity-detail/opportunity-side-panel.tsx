import type { Compensation, Note, Opportunity, Task } from "../../lib/types";
import { AddNotePanel } from "./add-note-panel";
import { CompensationPanel } from "./compensation-panel";
import { NotesPanel } from "./notes-panel";
import type {
  CompensationDraft,
  NoteDraft,
  TaskDraft,
} from "./opportunity-detail-types";
import { TasksPanel } from "./tasks-panel";

type OpportunitySidePanelProps = {
  opportunity: Opportunity;
  note: NoteDraft;
  task: TaskDraft;
  compensation: CompensationDraft;
  onNoteChange: (note: NoteDraft) => void;
  onTaskChange: (task: TaskDraft) => void;
  onCompensationChange: (compensation: CompensationDraft) => void;
  onAddNote: () => void;
  onAddTask: () => void;
  onSaveCompensation: () => void;
  onDeleteNote: (note: Note) => void;
  onDeleteTask: (task: Task) => void;
  onDeleteCompensation: (compensation: Compensation) => void;
  addingNote: boolean;
  addingTask: boolean;
  savingCompensation: boolean;
  deletingNoteId?: string;
  deletingTaskId?: string;
  deletingCompensation: boolean;
};

export function OpportunitySidePanel({
  opportunity,
  note,
  task,
  compensation,
  onNoteChange,
  onTaskChange,
  onCompensationChange,
  onAddNote,
  onAddTask,
  onSaveCompensation,
  onDeleteNote,
  onDeleteTask,
  onDeleteCompensation,
  addingNote,
  addingTask,
  savingCompensation,
  deletingNoteId,
  deletingTaskId,
  deletingCompensation,
}: OpportunitySidePanelProps) {
  return (
    <aside className="space-y-6 lg:col-span-5">
      <AddNotePanel
        note={note}
        onNoteChange={onNoteChange}
        onAddNote={onAddNote}
        addingNote={addingNote}
      />
      <TasksPanel
        tasks={opportunity.tasks}
        task={task}
        onTaskChange={onTaskChange}
        onAddTask={onAddTask}
        onDeleteTask={onDeleteTask}
        addingTask={addingTask}
        deletingTaskId={deletingTaskId}
      />
      <NotesPanel
        notes={opportunity.notesList}
        onDeleteNote={onDeleteNote}
        deletingNoteId={deletingNoteId}
      />
      <CompensationPanel
        currentCompensation={opportunity.compensation}
        compensation={compensation}
        onCompensationChange={onCompensationChange}
        onSaveCompensation={onSaveCompensation}
        onDeleteCompensation={onDeleteCompensation}
        savingCompensation={savingCompensation}
        deletingCompensation={deletingCompensation}
      />
    </aside>
  );
}
