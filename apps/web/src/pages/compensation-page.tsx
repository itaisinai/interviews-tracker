import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, LoadingButton, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";

export function CompensationPage() {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["compensation"], queryFn: api.compensation });
  const deleteCompensation = useMutation({ mutationFn: (id: string) => api.deleteCompensation(id), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["compensation"] }) });
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
        <table className="w-full text-left text-body-md">
          <thead className="border-b border-outline-variant bg-surface-container-lowest font-label-md text-label-md uppercase text-on-surface-variant">
            <tr><th className="px-6 py-4">Company</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Base salary</th><th className="px-6 py-4">Equity</th><th className="px-6 py-4">Bonus</th><th className="px-6 py-4">Offer status</th><th className="px-6 py-4">Notes</th><th className="px-6 py-4">Delete</th></tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.map((item) => <tr key={item.id} className="hover:bg-surface-container-low"><td className="px-6 py-4 font-semibold">{item.jobOpportunity?.companyName}</td><td className="px-6 py-4 text-on-surface-variant">{item.jobOpportunity?.roleTitle}</td><td className="px-6 py-4 font-geist">{item.baseSalary ?? "-"}</td><td className="px-6 py-4 font-geist">{item.equity ?? "-"}</td><td className="px-6 py-4 font-geist">{item.bonus ?? "-"}</td><td className="px-6 py-4"><Badge value={item.offerStatus} /></td><td className="px-6 py-4 text-on-surface-variant">{item.negotiationNotes ?? item.benefits}</td><td className="px-6 py-4"><LoadingButton compact aria-label="Delete compensation" className="text-error" icon="delete" loading={deleteCompensation.isPending && deleteCompensation.variables === item.id} onClick={() => { if (window.confirm("Delete this compensation record?")) deleteCompensation.mutate(item.id); }} /></td></tr>)}
          </tbody>
        </table>
      </div>
    </>
  );
}
