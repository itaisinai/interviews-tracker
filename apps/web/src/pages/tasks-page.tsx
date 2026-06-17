import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/badge";
import { DataTable, MaterialIcon } from "@interviews-tracker/design-system";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";
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
  const columns = useMemo<ColumnDef<(typeof rows)[number]>[]>(() => [
    { header: "Due date", cell: ({ row }) => formatDate(row.original.dueDate) },
    { header: "Company", cell: ({ row }) => <span className="font-semibold text-on-background">{row.original.jobOpportunity?.companyName}</span> },
    { header: "Task", cell: ({ row }) => <span className="font-medium text-on-background">{row.original.title}</span> },
    { header: "Priority", cell: ({ row }) => <Badge value={row.original.priority} /> },
    { header: "Status", cell: ({ row }) => <Badge value={row.original.status} /> },
    { header: "Notes", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.notes}</span> },
    {
      header: "Delete",
      cell: ({ row }) => (
        <LoadingButton compact aria-label="Delete task" className="text-error" icon="delete" loading={deleteTask.isPending && deleteTask.variables === row.original.id} onClick={() => { if (window.confirm("Delete this task?")) deleteTask.mutate(row.original.id); }} />
      )
    }
  ], [deleteTask]);

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
        <div className="overflow-x-auto custom-scrollbar">
          <DataTable data={rows} columns={columns} className="min-w-[1000px]" emptyState={<span>No tasks match the current filter.</span>} />
        </div>
      </div>
    </>
  );
}
