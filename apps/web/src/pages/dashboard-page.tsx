import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "../components/badge";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, PageErrorState, PageLoadingState } from "../components/loading-state";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";

const cardMeta = [
  ["activeProcesses", "Active Processes", "sync", "text-primary", "bg-primary/10"],
  ["potential", "Potential", "explore", "text-secondary", "bg-secondary/10"],
  ["upcomingInteractions", "Interactions", "event", "text-tertiary", "bg-tertiary/10"],
  ["offers", "Offers", "payments", "text-primary", "bg-primary/10"],
  ["rejections", "Rejections", "block", "text-error", "bg-error/10"],
  ["highPriority", "High Priority", "priority_high", "text-tertiary", "bg-tertiary/10"],
  ["tasksDueSoon", "Tasks Due Soon", "assignment_turned_in", "text-secondary", "bg-secondary/10"]
] as const;

export function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });

  if (isLoading || !data) {
    return <PageLoadingState title="Dashboard" description="Loading your pipeline, tasks, and upcoming interactions." />;
  }

  if (isError) {
    return <PageErrorState title="Dashboard" description={error instanceof Error ? error.message : "Unable to load the dashboard."} onRetry={() => void refetch()} />;
  }

  return (
    <>
      <PageIntro
        title="Job Search Dashboard"
        description={`Tracking ${data.counts.activeProcesses + data.counts.potential} opportunities across your network.`}
        actions={
          <>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
            <Link className="btn btn-secondary" to="/parse">
              <MaterialIcon name="description" />
              Parse Job Description
            </Link>
            <Link className="btn btn-primary" to="/opportunities/new">
              <MaterialIcon name="add" />
              Add Opportunity
            </Link>
          </>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-7">
        {cardMeta.map(([key, label, icon, textClass, bgClass]) => (
          <div key={key} className="group rounded-xl border border-outline-variant bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all hover:shadow-lg">
            <div className="mb-2 flex items-start justify-between">
              <div className={`rounded-lg p-2 ${bgClass} ${textClass}`}>
                <MaterialIcon name={icon} />
              </div>
              <span className={`font-headline-md text-headline-md font-bold ${textClass}`}>{data.counts[key] ?? 0}</span>
            </div>
            <p className="font-label-md text-label-md uppercase tracking-wider text-on-surface-variant">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="panel p-6 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-title-md text-title-md font-bold">Upcoming Interactions</h3>
            <Link className="font-label-md text-label-md text-primary" to="/interactions">View all</Link>
          </div>
          <div className="space-y-4">
            {data.upcomingInteractions.map((item) => (
              <div key={item.id} className="rounded-xl border-2 border-primary bg-white p-5 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">{formatDateTime(item.date)}</span>
                  <span className="h-1 w-1 rounded-full bg-outline-variant" />
                  <MaterialIcon name="call" filled className="text-primary" />
                  <span className="font-semibold">{item.type}</span>
                </div>
                <h4 className="font-headline-md text-headline-md">{item.jobOpportunity?.companyName}</h4>
                <p className="mt-1 text-body-md text-on-surface-variant">{item.agenda}</p>
                {item.followUp ? <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md italic text-on-background">{item.followUp}</p> : null}
              </div>
            ))}
            {data.upcomingInteractions.length === 0 ? <p className="text-body-md text-on-surface-variant">No upcoming interactions.</p> : null}
          </div>
        </section>

        <aside className="space-y-6 lg:col-span-5">
          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">Active Processes</h3>
            <div className="space-y-3">
              {data.activeProcesses.map((item) => (
                <Link key={item.id} to={`/opportunities/${item.id}`} className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 transition-colors hover:bg-surface-container">
                  <div>
                    <p className="font-semibold">{item.companyName}</p>
                    <p className="text-body-md text-on-surface-variant">{item.roleTitle}</p>
                  </div>
                  <Badge value={item.status} />
                </Link>
              ))}
            </div>
          </section>

          <section className="panel p-6">
            <h3 className="mb-4 font-title-md text-title-md font-bold">High Priority Potential</h3>
            <div className="space-y-3">
              {data.highPriorityPotential.map((item) => (
                <Link key={item.id} to={`/opportunities/${item.id}`} className="flex items-center justify-between rounded-lg border border-outline-variant bg-white p-4 hover:bg-surface-container-low">
                  <span className="font-medium">{item.companyName}</span>
                  <Badge value={item.priority} />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-6">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Tasks This Week</p>
          <h3 className="mt-2 font-headline-lg text-headline-lg">{data.tasksDueThisWeek.length}</h3>
          <p className="mt-1 text-body-md font-medium text-primary">Preparation and follow-up actions</p>
          <MaterialIcon name="trending_up" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" />
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-outline-variant bg-white p-6">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Pipeline Focus</p>
          <h3 className="mt-2 font-headline-lg text-headline-lg">{data.counts.activeProcesses}</h3>
          <p className="mt-1 text-body-md font-medium text-secondary">Active companies in motion</p>
          <MaterialIcon name="rocket_launch" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" />
        </div>
        <div className="relative overflow-hidden rounded-2xl bg-primary p-6 text-on-primary">
          <p className="font-label-md text-label-md uppercase opacity-80">Offer Tracking</p>
          <h3 className="mt-2 font-headline-lg text-headline-lg">{data.counts.offers}</h3>
          <p className="mt-1 text-body-md font-medium opacity-90">Compensation conversations</p>
          <MaterialIcon name="monetization_on" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" />
        </div>
      </div>
    </>
  );
}
