import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";

export function TasksPage() {
  const [filter, setFilter] = useState("pending");
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["tasks"], queryFn: api.tasks });
  const deleteTask = useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tasks"] }) });
  const rows = useMemo(() => data.filter((item) => {
    if (filter === "pending") return item.status === "PENDING" || item.status === "IN_PROGRESS";
    if (filter === "high") return item.priority === "HIGH";
    if (filter === "done") return item.status === "DONE";
    if (filter === "week") return item.dueDate && +new Date(item.dueDate) <= Date.now() + 7 * 86400000;
    return true;
  }), [data, filter]);

  if (isLoading) {
    return <PageLoadingState title="Tasks" description="Loading preparation, follow-up, and research work." />;
  }

  if (isError) {
    return <PageErrorState title="Tasks" description={error instanceof Error ? error.message : "Unable to load tasks."} onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageIntro title="Tasks" description="Preparation, follow-up, and research work across the pipeline." actions={<>{isFetching ? <InlineLoadingState label="Refreshing" /> : null}<button className="btn btn-primary"><MaterialIcon name="add" />Add Task</button></>} />
      <div className="mb-6 flex flex-wrap gap-2">
        {["pending", "week", "high", "done", "all"].map((item) => <button key={item} className={`rounded-full px-4 py-1.5 font-label-md text-label-md ${filter === item ? "bg-primary-container text-on-primary-container" : "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low"}`} onClick={() => setFilter(item)}>{item}</button>)}
      </div>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
        <table className="w-full text-left text-body-md">
          <thead className="border-b border-outline-variant bg-surface-container-lowest font-label-md text-label-md uppercase text-on-surface-variant">
            <tr><th className="px-6 py-4">Due date</th><th className="px-6 py-4">Company</th><th className="px-6 py-4">Task</th><th className="px-6 py-4">Priority</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Notes</th><th className="px-6 py-4">Delete</th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((item) => <tr key={item.id} className="hover:bg-surface-container-low"><td className="px-6 py-4">{formatDate(item.dueDate)}</td><td className="px-6 py-4 font-semibold">{item.jobOpportunity?.companyName}</td><td className="px-6 py-4 font-medium">{item.title}</td><td className="px-6 py-4"><Badge value={item.priority} /></td><td className="px-6 py-4"><Badge value={item.status} /></td><td className="px-6 py-4 text-on-surface-variant">{item.notes}</td><td className="px-6 py-4"><LoadingButton compact aria-label="Delete task" className="text-error" icon="delete" loading={deleteTask.isPending && deleteTask.variables === item.id} onClick={() => { if (window.confirm("Delete this task?")) deleteTask.mutate(item.id); }} /></td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
