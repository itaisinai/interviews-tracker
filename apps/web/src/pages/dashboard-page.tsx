import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";

import { InlineLoadingState, MaterialIcon, PageErrorState, PageLoadingState } from "@interviews-tracker/design-system";

import { PageIntro } from "../components/app-layout";
import { Badge } from "../components/badge";
import { AppCalendar } from "../components/calendar";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { buildInteractionCalendarEvents } from "../components/interactions-flow";
import { api } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { Interaction } from "../lib/types";

function splitMonthDay(value: string) {
  const date = new Date(value);
  return {
    month: date.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: "numeric" }).toUpperCase(),
  };
}

export function DashboardPage() {
  const { user } = useAuth0();
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
  });
  const { data: interactions = [] } = useQuery({
    queryKey: ["interactions"],
    queryFn: api.interactions,
  });
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Alex";

  const selectedInteraction = useMemo(
    () =>
      interactions.find((item) => item.slug === selectedInteractionId) ??
      data?.upcomingInteractions.find((item) => item.slug === selectedInteractionId) ??
      null,
    [data?.upcomingInteractions, interactions, selectedInteractionId]
  );
  const selectedOpportunity = useMemo(() => {
    if (!selectedInteraction?.jobOpportunity) {
      return null;
    }

    return {
      ...selectedInteraction.jobOpportunity,
      interactions: interactions.filter((item) => item.jobOpportunityId === selectedInteraction.jobOpportunityId),
    };
  }, [interactions, selectedInteraction]);

  const mobilePriorityItems = useMemo(() => {
    if (!data) {
      return [];
    }

    const seen = new Set<string>();
    return [...data.activeProcesses, ...data.highPriorityPotential]
      .filter((item) => {
        if (seen.has(item.slug)) {
          return false;
        }
        seen.add(item.slug);
        return true;
      })
      .slice(0, 2);
  }, [data]);

  const calendarEvents = useMemo(() => buildInteractionCalendarEvents(interactions), [interactions]);

  const pipelineHealth = Math.round(
    ((data?.counts.activeProcesses ?? 0) /
      Math.max((data?.counts.activeProcesses ?? 0) + (data?.counts.potential ?? 0), 1)) *
      100
  );

  if (isLoading || !data) {
    return <PageLoadingState title="Dashboard" description="Loading your pipeline and upcoming interactions." />;
  }

  if (isError) {
    return (
      <PageErrorState
        title="Dashboard"
        description={error instanceof Error ? error.message : "Unable to load the dashboard."}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <>
      <div className="md:hidden">
        <section className="mb-8">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Hi {displayName},</h1>
          <p className="font-body-md text-on-surface-variant">
            You have {data.counts.upcomingInteractions} interviews scheduled this week.
          </p>
        </section>

        <section className="mb-8">
          <div className="flex gap-4 overflow-x-auto pb-1 hide-scrollbar snap-x">
            <div className="min-w-[240px] snap-start rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Active Processes</span>
                <MaterialIcon name="trending_up" className="text-primary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-headline-md text-headline-md font-bold">{data.counts.activeProcesses}</span>
                <span className="font-label-sm text-label-sm text-primary">{pipelineHealth}% pipeline health</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-low">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(pipelineHealth, 10)}%` }} />
              </div>
              <p className="mt-2 font-label-sm text-label-sm text-on-surface-variant">Open opportunities in motion</p>
            </div>

            <div className="min-w-[240px] snap-start rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Potential</span>
                <MaterialIcon name="explore" className="text-secondary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-headline-md text-headline-md font-bold">{data.counts.potential}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">leads</span>
              </div>
              <p className="mt-4 font-label-sm text-label-sm text-secondary">Potential opportunities to research</p>
            </div>

            <div className="min-w-[240px] snap-start rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-label-md text-label-md uppercase text-on-surface-variant">Interactions</span>
                <MaterialIcon name="event" className="text-tertiary" />
              </div>
              <div className="flex items-end gap-2">
                <span className="font-headline-md text-headline-md font-bold">{data.counts.upcomingInteractions}</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">this week</span>
              </div>
              <p className="mt-4 font-label-sm text-label-sm text-on-surface-variant">
                Upcoming conversations to prepare for
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title-md text-title-md font-bold">High Priority</h2>
            <Link className="font-label-md text-label-md text-primary" to="/opportunities">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {mobilePriorityItems.map((item) => {
              const nextInteraction = item.interactions?.find(
                (interaction) => new Date(interaction.date) >= new Date()
              );
              const badgeValue =
                item.status === "OFFER"
                  ? "OFFER"
                  : item.status === "REJECTED"
                    ? "CLOSED"
                    : item.pipelineType === "ACTIVE_PROCESS"
                      ? "INTERVIEWING"
                      : "APPLIED";

              return (
                <Link
                  key={item.slug}
                  to={`/opportunities/${item.slug}`}
                  className={`block rounded-xl border bg-white p-4 shadow-sm ${item.pipelineType === "ACTIVE_PROCESS" ? "border-primary" : "border-outline-variant"}`}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-title-md text-title-md font-bold text-on-background">
                        {item.company.name}
                      </h3>
                      <p className="break-words font-body-md text-body-md text-on-surface-variant">{item.roleTitle}</p>
                    </div>
                    <Badge value={badgeValue} />
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-outline-variant/20 pt-4">
                    <div className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                      <MaterialIcon
                        name={item.referrerOrConnection ? "account_tree" : "schedule"}
                        className="text-[18px]"
                      />
                      <span className="truncate">{item.referrerOrConnection ?? "Recent activity"}</span>
                    </div>
                    <Badge value={item.priority} />
                    <div className="ml-auto font-label-md text-label-md font-semibold text-primary">
                      {item.nextStep ?? nextInteraction?.type ?? "Review"}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title-md text-title-md font-bold">Upcoming Interactions</h2>
            <Link className="font-label-md text-label-md text-primary" to="/interactions">
              View All
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-white">
            {data.upcomingInteractions.map((item, index) => {
              const parts = splitMonthDay(item.date);
              return (
                <button
                  key={item.slug}
                  type="button"
                  className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${index > 0 ? "border-t border-outline-variant/40" : ""}`}
                  aria-label={`Open interaction for ${item.jobOpportunity?.company?.name ?? item.type}`}
                  onClick={() => setSelectedInteractionId(item.slug)}
                >
                  <div className="w-10 shrink-0 text-center">
                    <div className="font-label-sm text-label-sm text-primary">{parts.month}</div>
                    <div className="font-headline-md text-headline-md font-semibold text-on-background">
                      {parts.day}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-body-lg text-body-lg font-semibold text-on-background">
                      {item.jobOpportunity?.company?.name ?? item.type}
                    </h3>
                    <p className="truncate font-body-md text-body-md text-on-surface-variant">
                      {item.agenda ?? item.followUp ?? item.type}
                    </p>
                  </div>
                  <MaterialIcon
                    name={item.type.toLowerCase().includes("email") ? "mail" : "video_call"}
                    className="text-on-surface-variant"
                  />
                </button>
              );
            })}
            {data.upcomingInteractions.length === 0 ? (
              <p className="p-4 text-body-md text-on-surface-variant">No upcoming interactions.</p>
            ) : null}
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-primary p-6 text-on-primary">
          <p className="font-body-lg text-body-lg font-semibold">Keep it up, {displayName}!</p>
          <p className="mt-2 font-body-md text-body-md leading-6 text-on-primary/90">
            You have {data.counts.upcomingInteractions} upcoming interactions this week. Momentum is visible.
          </p>
        </section>
      </div>

      <div className="hidden md:block">
        <PageIntro
          title="Job Search Dashboard"
          description={`Tracking ${data.counts.activeProcesses + data.counts.potential} opportunities across your network.`}
          actions={
            <>
              {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
              <Link className="btn btn-primary" to="/opportunities/new">
                <MaterialIcon name="add" />
                New Opportunity
              </Link>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <section className="panel p-6 lg:col-span-7">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-title-md text-title-md font-bold">Upcoming Interactions</h3>
              <Link className="font-label-md text-label-md text-primary" to="/interactions">
                View all
              </Link>
            </div>
            <div className="space-y-4">
              {data.upcomingInteractions.map((item) => (
                <button
                  key={item.slug}
                  type="button"
                  className="w-full rounded-xl border border-outline-variant bg-white p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:bg-surface-container-low hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label={`Open interaction for ${item.jobOpportunity?.company?.name ?? item.type}`}
                  onClick={() => setSelectedInteractionId(item.slug)}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                      {formatDateTime(item.date)}
                    </span>
                    <span className="h-1 w-1 rounded-full bg-outline-variant" />
                    <MaterialIcon name="call" filled className="text-primary" />
                    <span className="font-semibold">{item.type}</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md">{item.jobOpportunity?.company?.name}</h4>
                  <p className="mt-1 text-body-md text-on-surface-variant">{item.agenda}</p>
                  {item.followUp ? (
                    <p className="mt-3 rounded-lg bg-surface-container-low p-3 text-body-md italic text-on-background">
                      {item.followUp}
                    </p>
                  ) : null}
                </button>
              ))}
              {data.upcomingInteractions.length === 0 ? (
                <p className="text-body-md text-on-surface-variant">No upcoming interactions.</p>
              ) : null}
            </div>
          </section>

          <aside className="space-y-6 lg:col-span-5">
            <AppCalendar
              eyebrow="Calendar"
              events={calendarEvents}
              onEventClick={(event) => setSelectedInteractionId(event.id)}
            />

            <section className="panel p-6">
              <h3 className="mb-4 font-title-md text-title-md font-bold">Active Processes</h3>
              <div className="space-y-3">
                {data.activeProcesses.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/opportunities/${item.slug}`}
                    className="flex items-center justify-between rounded-lg bg-surface-container-low p-4 transition-colors hover:bg-surface-container"
                  >
                    <div>
                      <p className="font-semibold">{item.company.name}</p>
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
                  <Link
                    key={item.slug}
                    to={`/opportunities/${item.slug}`}
                    className="flex items-center justify-between rounded-lg border border-outline-variant bg-white p-4 hover:bg-surface-container-low"
                  >
                    <span className="font-medium">{item.company.name}</span>
                    <Badge value={item.priority} />
                  </Link>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="relative overflow-hidden rounded-2xl bg-surface-container-high p-6">
            <p className="font-label-md text-label-md uppercase text-on-surface-variant">Interactions This Week</p>
            <h3 className="mt-2 font-headline-lg text-headline-lg">{data.counts.upcomingInteractions}</h3>
            <p className="mt-1 text-body-md font-medium text-primary">Scheduled conversations</p>
            <MaterialIcon name="event" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" />
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
            <p className="mt-1 text-body-md font-medium opacity-90">Offer-stage opportunities</p>
            <MaterialIcon name="monetization_on" className="absolute -bottom-4 -right-4 text-[80px] opacity-10" />
          </div>
        </div>
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        selectedOpportunity={selectedOpportunity}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={setSelectedInteractionId}
      />
    </>
  );
}
