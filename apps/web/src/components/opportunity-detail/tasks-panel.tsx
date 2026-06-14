import type { Task } from "../../lib/types";
import type { TaskDraft } from "./opportunity-detail-types";
import { Badge } from "../badge";
import { LoadingButton } from "../loading-state";

type TasksPanelProps = {
  tasks: Task[];
  task: TaskDraft;
  onTaskChange: (task: TaskDraft) => void;
  onAddTask: () => void;
  onDeleteTask: (task: Task) => void;
  addingTask: boolean;
  deletingTaskId?: string;
};

export function TasksPanel({
  tasks,
  task,
  onTaskChange,
  onAddTask,
  onDeleteTask,
  addingTask,
  deletingTaskId,
}: TasksPanelProps) {
  return (
    <section className="panel p-6">
      <h3 className="mb-4 font-title-md text-title-md font-bold">Tasks</h3>
      {tasks.map((item) => (
        <div key={item.id} className="mb-3 rounded-lg bg-surface-container-low p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{item.title}</p>
            <div className="flex items-center gap-2">
              <Badge value={item.status} />
              <LoadingButton
                compact
                aria-label="Delete task"
                className="text-error"
                icon="delete"
                loading={deletingTaskId === item.id}
                onClick={() => onDeleteTask(item)}
              />
            </div>
          </div>
          <p className="mt-1 text-body-md text-on-surface-variant">{item.notes}</p>
        </div>
      ))}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <input
          className="input"
          value={task.title}
          onChange={(event) =>
            onTaskChange({ ...task, title: event.target.value })
          }
          placeholder="Task title"
        />
        <input
          className="input"
          type="date"
          value={task.dueDate}
          onChange={(event) =>
            onTaskChange({ ...task, dueDate: event.target.value })
          }
        />
        <textarea
          className="input col-span-2"
          value={task.notes}
          onChange={(event) =>
            onTaskChange({ ...task, notes: event.target.value })
          }
          placeholder="Task notes"
        />
        <LoadingButton
          className="btn btn-secondary"
          loading={addingTask}
          loadingLabel="Adding..."
          icon="assignment_add"
          onClick={onAddTask}
        >
          Add task
        </LoadingButton>
      </div>
    </section>
  );
}
