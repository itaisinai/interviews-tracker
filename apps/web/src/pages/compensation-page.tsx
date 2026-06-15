import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "../components/badge";
import { DataTable, MaterialIcon } from "@interviews-tracker/design-system";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";
import { api } from "../lib/api";

export function CompensationPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["compensation"], queryFn: api.compensation });
  const deleteCompensation = useMutation({ mutationFn: (id: string) => api.deleteCompensation(id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compensation"] }) });
  const columns = [
    { header: "Company", cell: ({ row }) => <span className="font-semibold">{row.original.jobOpportunity?.companyName}</span> },
    { header: "Role", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.jobOpportunity?.roleTitle}</span> },
    { header: "Base salary", cell: ({ row }) => <span className="font-geist">{row.original.baseSalary ?? "-"}</span> },
    { header: "Equity", cell: ({ row }) => <span className="font-geist">{row.original.equity ?? "-"}</span> },
    { header: "Bonus", cell: ({ row }) => <span className="font-geist">{row.original.bonus ?? "-"}</span> },
    { header: "Offer status", cell: ({ row }) => <Badge value={row.original.offerStatus} /> },
    { header: "Notes", cell: ({ row }) => <span className="text-on-surface-variant">{row.original.negotiationNotes ?? row.original.benefits}</span> },
    {
      header: "Delete",
      cell: ({ row }) => (
        <LoadingButton compact aria-label="Delete compensation" className="text-error" icon="delete" loading={deleteCompensation.isPending && deleteCompensation.variables === row.original.id} onClick={() => { if (window.confirm("Delete this compensation record?")) deleteCompensation.mutate(row.original.id); }} />
      )
    }
  ] satisfies ColumnDef<(typeof data)[number]>[];
  if (isLoading) {
    return <PageLoadingState title="Compensation" description="Loading offer details and negotiation notes." />;
  }

  if (isError) {
    return <PageErrorState title="Compensation" description={error instanceof Error ? error.message : "Unable to load compensation records."} onRetry={() => void refetch()} />;
  }
  return (
    <>
      <PageIntro title="Compensation" description="Track offer details, negotiation notes, and decision status." actions={isFetching ? <InlineLoadingState label="Refreshing" /> : undefined} />
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-on-primary"><p className="font-label-md text-label-md uppercase opacity-80">Offers</p><h3 className="mt-2 font-headline-lg text-headline-lg">{data.filter((item) => item.offerStatus !== "NOT_DISCUSSED").length}</h3><MaterialIcon name="payments" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" /></div>
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-white p-6"><p className="font-label-md text-label-md uppercase text-on-surface-variant">Written Offers</p><h3 className="mt-2 font-headline-lg text-headline-lg">{data.filter((item) => item.offerStatus === "WRITTEN_OFFER").length}</h3><MaterialIcon name="contract" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" /></div>
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-6"><p className="font-label-md text-label-md uppercase text-on-surface-variant">Accepted</p><h3 className="mt-2 font-headline-lg text-headline-lg">{data.filter((item) => item.offerStatus === "ACCEPTED").length}</h3><MaterialIcon name="check_circle" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" /></div>
      </div>
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-white shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <DataTable data={data} columns={columns} className="min-w-[1000px]" emptyState={<span>No compensation records yet.</span>} />
        </div>
      </div>
    </>
  );
}
