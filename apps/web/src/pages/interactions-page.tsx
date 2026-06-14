import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GmailInteractionPanel } from "../components/gmail-interaction-panel";
import { InteractionsDrawer } from "../components/interactions-drawer";
import { OpportunityInteractionTimeline } from "../components/interactions-timeline";
import { PageIntro } from "../components/app-shell";
import { InlineLoadingState, PageErrorState, PageLoadingState } from "../components/loading-state";
import { MaterialIcon } from "../components/material-icon";
import { labelForInteractionType } from "../lib/enum-labels";
import { api } from "../lib/api";
import { promoteOverdueInteractionsForRead } from "../lib/interaction-status";
import type { Interaction } from "../lib/types";

type InteractionOpportunityGroup = {
  opportunityId: string;
  companyName: string;
  roleTitle: string;
  interactions: Interaction[];
  latestTimestamp: number;
};

function buildOpportunityGroups(interactions: readonly Interaction[]) {
  const groups = new Map<string, InteractionOpportunityGroup>();

  for (const interaction of interactions) {
    const existing = groups.get(interaction.jobOpportunityId);
    const timestamp = new Date(interaction.date).getTime();

    if (!existing) {
      groups.set(interaction.jobOpportunityId, {
        opportunityId: interaction.jobOpportunityId,
        companyName: interaction.jobOpportunity?.companyName ?? "Unknown company",
        roleTitle: interaction.jobOpportunity?.roleTitle ?? "Unknown role",
        interactions: [interaction],
        latestTimestamp: timestamp
      });
      continue;
    }

    existing.interactions.push(interaction);
    existing.latestTimestamp = Math.max(existing.latestTimestamp, timestamp);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.latestTimestamp !== right.latestTimestamp) {
      return right.latestTimestamp - left.latestTimestamp;
    }

    return left.companyName.localeCompare(right.companyName) || left.roleTitle.localeCompare(right.roleTitle);
  });
}

function filterOpportunityGroup(group: InteractionOpportunityGroup, filter: string) {
  if (filter === "upcoming") {
    return group.interactions.some((item) => new Date(item.date) >= new Date());
  }

  if (filter === "done") {
    return group.interactions.some((item) => item.status === "DONE");
  }

  if (filter === "followup") {
    return group.interactions.some((item) => item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim()));
  }

  return true;
}

export function InteractionsPage() {
  const [filter, setFilter] = useState("upcoming");
  const [showGmailImport, setShowGmailImport] = useState(false);
  const [gmailOpportunityId, setGmailOpportunityId] = useState("");
  const [selectedInteractionId, setSelectedInteractionId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({ queryKey: ["interactions"], queryFn: api.interactions });
  const opportunitiesQuery = useQuery({ queryKey: ["opportunities", "gmail-import"], queryFn: () => api.opportunities("?summary=1"), staleTime: 30_000 });
  const { data: opportunities = [] } = opportunitiesQuery;
  const displayInteractions = useMemo(() => promoteOverdueInteractionsForRead(data), [data]);
  const opportunityGroups = useMemo(() => buildOpportunityGroups(displayInteractions), [displayInteractions]);
  const visibleOpportunityGroups = useMemo(() => opportunityGroups.filter((group) => filterOpportunityGroup(group, filter)), [filter, opportunityGroups]);
  const upcomingCalendar = useMemo(() => buildNextMonthCalendar(displayInteractions), [displayInteractions]);
  const gmailOpportunity = useMemo(() => opportunities.find((item) => item.id === gmailOpportunityId) ?? null, [gmailOpportunityId, opportunities]);
  const deleteInteraction = useMutation({
    mutationFn: (id: string) => api.deleteInteraction(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    }
  });
  const selectedInteraction = useMemo(() => displayInteractions.find((item) => item.id === selectedInteractionId) ?? null, [displayInteractions, selectedInteractionId]);
  const followUpCount = displayInteractions.filter((item) => item.status === "NEEDS_FOLLOW_UP" || Boolean(item.followUp?.trim())).length;
  const followUpPercent = displayInteractions.length > 0 ? Math.round((followUpCount / displayInteractions.length) * 100) : 0;

  useEffect(() => {
    if (selectedInteractionId && !displayInteractions.some((item) => item.id === selectedInteractionId)) {
      setSelectedInteractionId(null);
    }
  }, [displayInteractions, selectedInteractionId]);

  function openGmailImport() {
    const initialOpportunityId = gmailOpportunityId || opportunities[0]?.id || "";
    setGmailOpportunityId(initialOpportunityId);
    setShowGmailImport(true);
  }

  if (isLoading || opportunitiesQuery.isLoading) {
    return <PageLoadingState title="Interactions" description="Loading interactions and available opportunities." />;
  }

  if (isError) {
    return <PageErrorState title="Interactions" description={error instanceof Error ? error.message : "Unable to load interactions."} onRetry={() => void refetch()} />;
  }

  if (opportunitiesQuery.isError) {
    return <PageErrorState title="Interactions" description={opportunitiesQuery.error instanceof Error ? opportunitiesQuery.error.message : "Unable to load opportunities for the form."} onRetry={() => void opportunitiesQuery.refetch()} />;
  }

  return (
    <>
      <div className="md:hidden">
        <section className="mb-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-background">Interactions</h1>
              <p className="font-body-md text-on-surface-variant">Track networking and interview progress.</p>
            </div>
            {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={`rounded-full px-4 py-2 font-label-md text-label-md ${showGmailImport ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`} onClick={() => (showGmailImport ? setShowGmailImport(false) : openGmailImport())}>
              <MaterialIcon name="mail" />
              {showGmailImport ? "Hide Gmail" : "Gmail"}
            </button>
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-3 flex overflow-x-auto gap-3 pb-1 hide-scrollbar">
            {[
              ["upcoming", "Upcoming"],
              ["done", "Passed"],
              ["followup", "Waiting for response"],
              ["all", "All"]
            ].map(([key, label]) => (
              <button
                key={key}
                className={`whitespace-nowrap rounded-full px-4 py-2 font-label-md text-label-md transition-all ${
                  filter === key ? "bg-primary text-on-primary" : "border border-outline-variant bg-white text-on-surface-variant"
                }`}
                onClick={() => setFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="font-label-md text-label-md uppercase text-on-surface-variant">Upcoming</div>
              <div className="mt-2 font-headline-md text-headline-md font-bold">{displayInteractions.filter((item) => new Date(item.date) >= new Date()).length}</div>
            </div>
            <div className="rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
              <div className="font-label-md text-label-md uppercase text-on-surface-variant">Waiting for response</div>
              <div className="mt-2 font-headline-md text-headline-md font-bold">{followUpPercent}%</div>
            </div>
          </div>
        </section>

        {showGmailImport ? (
          <section className="mb-5 rounded-xl border border-outline-variant bg-white p-4 shadow-sm">
            <div className="mb-4">
              <h3 className="font-title-md text-title-md font-bold">Add interaction from Gmail</h3>
              <p className="mt-1 text-body-md text-on-surface-variant">Pick an opportunity, search Gmail, then review before saving.</p>
            </div>
            <Field label="Opportunity">
              <select className="input" value={gmailOpportunityId} onChange={(event) => setGmailOpportunityId(event.target.value)}>
                <option value="">Select company / role</option>
                {opportunities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.companyName} · {item.roleTitle}
                  </option>
                ))}
              </select>
            </Field>
            {gmailOpportunity ? (
              <div className="mt-4">
                <GmailInteractionPanel
                  opportunityId={gmailOpportunity.id}
                  companyName={gmailOpportunity.companyName}
                  roleTitle={gmailOpportunity.roleTitle}
                  onSaved={() => {
                    setShowGmailImport(false);
                  }}
                />
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-4 text-body-md text-on-surface-variant">
                Choose an opportunity to search Gmail for related emails.
              </div>
            )}
          </section>
        ) : null}

        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-title-md text-title-md font-bold">Opportunity timelines</h2>
            <span className="font-label-md text-label-md text-on-surface-variant">{visibleOpportunityGroups.length}</span>
          </div>
          <div className="space-y-4">
            {visibleOpportunityGroups.map((group) => (
              <OpportunityInteractionTimeline
                key={group.opportunityId}
                companyName={group.companyName}
                roleTitle={group.roleTitle}
                interactions={group.interactions}
                selectedInteractionId={selectedInteractionId}
                onSelectInteraction={setSelectedInteractionId}
                onDeleteInteraction={(interactionId) => deleteInteraction.mutate(interactionId)}
                isDeletingInteraction={(interactionId) => deleteInteraction.isPending && deleteInteraction.variables === interactionId}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="hidden md:block">
        <PageIntro
          title="Interactions"
          description="Track your networking and interview progress with precision."
          actions={
            <>
              {isFetching ? <InlineLoadingState label="Refreshing" /> : null}
              <button className="btn btn-secondary" onClick={() => (showGmailImport ? setShowGmailImport(false) : openGmailImport())}>
                <MaterialIcon name="mail" />
                {showGmailImport ? "Hide Gmail Import" : "Add interaction from Gmail"}
              </button>
            </>
          }
        />
        {showGmailImport ? (
          <section className="panel mb-8 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <MaterialIcon name="mail" />
              </div>
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold">Add interaction from Gmail</h3>
                <p className="text-body-md text-on-surface-variant">Pick an opportunity, search Gmail for recent emails, then review the parsed interaction before saving.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <Field label="Opportunity">
                <select className="input" value={gmailOpportunityId} onChange={(event) => setGmailOpportunityId(event.target.value)}>
                  <option value="">Select company / role</option>
                  {opportunities.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.companyName} · {item.roleTitle}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="flex items-center gap-3">
                <button className="btn btn-secondary" onClick={() => setShowGmailImport(false)}>
                  <MaterialIcon name="close" />
                  Close
                </button>
              </div>
            </div>
            {gmailOpportunity ? (
              <div className="mt-6">
                <GmailInteractionPanel
                  opportunityId={gmailOpportunity.id}
                  companyName={gmailOpportunity.companyName}
                  roleTitle={gmailOpportunity.roleTitle}
                  onSaved={() => {
                    setShowGmailImport(false);
                  }}
                />
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-outline-variant bg-surface-container-low p-5 text-body-md text-on-surface-variant">
                Choose an opportunity to search Gmail for related emails.
              </div>
            )}
          </section>
        ) : null}
        <div className="mb-8 flex flex-wrap gap-2">
          {[
            ["upcoming", "Upcoming"],
            ["done", "Passed"],
            ["followup", "Waiting for response"],
            ["all", "All"]
          ].map(([key, label]) => <button key={key} className={`rounded-full px-4 py-1.5 font-label-md text-label-md transition-all ${filter === key ? "bg-primary-container text-on-primary-container" : "border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container-low"}`} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-8">
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm">
                <MaterialIcon name="event" filled />
              </div>
              <div className="min-w-0">
                <h3 className="font-title-md text-title-md font-bold">Opportunity timelines</h3>
                <p className="text-body-md text-on-surface-variant">Each opportunity is grouped into its own timeline.</p>
              </div>
            </div>

            <div className="space-y-6">
              {visibleOpportunityGroups.map((group) => (
                <OpportunityInteractionTimeline
                  key={group.opportunityId}
                  companyName={group.companyName}
                  roleTitle={group.roleTitle}
                  interactions={group.interactions}
                  selectedInteractionId={selectedInteractionId}
                  onSelectInteraction={setSelectedInteractionId}
                  onDeleteInteraction={(interactionId) => deleteInteraction.mutate(interactionId)}
                  isDeletingInteraction={(interactionId) => deleteInteraction.isPending && deleteInteraction.variables === interactionId}
                />
              ))}
            </div>
          </section>
          <aside className="space-y-6 lg:col-span-4">
            <NextMonthCalendar calendar={upcomingCalendar} />
            <div className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
              <h3 className="mb-3 font-title-md text-title-md font-bold">Interaction Health</h3>
              <div className="mb-6 rounded-xl bg-surface-container-low p-4">
                <p className="font-label-md text-label-md text-on-surface-variant">Needs Follow-up</p>
                <div className="mt-2 flex items-end justify-between">
                  <span className="font-headline-md text-headline-md font-bold">{followUpPercent}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${followUpPercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total" value={data.length} />
                <StatCard label="Upcoming" value={data.filter((item) => new Date(item.date) >= new Date()).length} />
                <StatCard label="Passed" value={data.filter((item) => item.status === "DONE").length} />
                <StatCard label="Waiting" value={followUpCount} />
              </div>
            </div>
          </aside>
        </div>
      </div>
      <InteractionsDrawer
        selectedInteraction={selectedInteraction}
        onClose={() => setSelectedInteractionId(null)}
        onSelectInteraction={(interactionId) => setSelectedInteractionId(interactionId)}
      />
    </>
  );
}

const dayFormatter = new Intl.DateTimeFormat(undefined, { day: "numeric" });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });
const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type CalendarMeeting = {
  id: string;
  title: string;
  time: string;
  timestamp: number;
};

type CalendarDay = {
  key: string;
  date: Date;
  meetings: CalendarMeeting[];
};

type NextMonthCalendarModel = {
  label: string;
  leadingBlankDays: number;
  days: CalendarDay[];
  totalMeetings: number;
};

function buildNextMonthCalendar(interactions: readonly Interaction[]): NextMonthCalendarModel {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const meetingsByDay = new Map<string, CalendarMeeting[]>();

  for (const interaction of interactions) {
    const date = new Date(interaction.date);

    if (date < monthStart || date > new Date(monthEnd.getFullYear(), monthEnd.getMonth(), monthEnd.getDate(), 23, 59, 59, 999)) {
      continue;
    }

    const key = formatCalendarKey(date);
    const titleParts = [interaction.jobOpportunity?.companyName, interaction.stage || labelForInteractionType(interaction.type), interaction.personName].filter(Boolean);
    const title = titleParts.length > 0 ? titleParts.join(" · ") : labelForInteractionType(interaction.type);
    const meetings = meetingsByDay.get(key) ?? [];

    meetings.push({
      id: interaction.id,
      title,
      time: timeFormatter.format(date),
      timestamp: date.getTime()
    });
    meetingsByDay.set(key, meetings);
  }

  const days: CalendarDay[] = Array.from({ length: monthEnd.getDate() }, (_, index) => {
    const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1);
    const key = formatCalendarKey(date);
    const meetings = [...(meetingsByDay.get(key) ?? [])].sort((left, right) => left.timestamp - right.timestamp);

    return { key, date, meetings };
  });

  return {
    label: monthFormatter.format(monthStart),
    leadingBlankDays: monthStart.getDay(),
    days,
    totalMeetings: days.reduce((total, day) => total + day.meetings.length, 0)
  };
}

function formatCalendarKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dotClassName(meetingCount: number) {
  if (meetingCount > 1) return "bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.18)]";
  if (meetingCount === 1) return "bg-primary shadow-[0_0_0_3px_rgba(0,121,83,0.14)]";
  return "bg-outline-variant";
}

function NextMonthCalendar({ calendar }: { calendar: NextMonthCalendarModel }) {
  return (
    <section className="rounded-xl border border-outline-variant bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-label-md text-label-md uppercase tracking-[0.18em] text-primary">Next month</p>
          <h3 className="mt-1 font-title-md text-title-md font-bold text-on-background">{calendar.label}</h3>
        </div>
        <div className="rounded-full bg-surface-container-low px-3 py-1 font-label-md text-label-md text-on-surface-variant">
          {calendar.totalMeetings} {calendar.totalMeetings === 1 ? "meeting" : "meetings"}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-3 text-label-sm font-medium text-on-surface-variant">
        <CalendarLegendDot className="bg-outline-variant" label="Empty" />
        <CalendarLegendDot className="bg-primary" label="1 meeting" />
        <CalendarLegendDot className="bg-amber-400" label="Multiple" />
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center">
        {weekdayLabels.map((day) => (
          <div key={day} className="py-1 font-label-sm text-label-sm text-on-surface-variant">
            {day}
          </div>
        ))}
        {Array.from({ length: calendar.leadingBlankDays }, (_, index) => (
          <div key={`blank-${index}`} aria-hidden="true" />
        ))}
        {calendar.days.map((day) => (
          <CalendarDayCell key={day.key} day={day} />
        ))}
      </div>
    </section>
  );
}

function CalendarLegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}

function CalendarDayCell({ day }: { day: CalendarDay }) {
  const hasMeetings = day.meetings.length > 0;
  const accessibleLabel = hasMeetings
    ? `${day.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${day.meetings.map((meeting) => `${meeting.time} ${meeting.title}`).join(", ")}`
    : `${day.date.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: no meetings`;

  return (
    <div className="group relative">
      <div
        className={`flex min-h-12 flex-col items-center justify-center rounded-xl border transition-all ${
          hasMeetings
            ? "border-primary/15 bg-primary/5 text-on-background hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/10 hover:shadow-sm"
            : "border-transparent bg-surface-container-low/60 text-on-surface-variant hover:bg-surface-container-low"
        }`}
        aria-label={accessibleLabel}
        tabIndex={0}
      >
        <span className="font-label-md text-label-md">{dayFormatter.format(day.date)}</span>
        <span className={`mt-1 h-2 w-2 rounded-full ${dotClassName(day.meetings.length)}`} />
      </div>

      <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-3 hidden w-64 -translate-x-1/2 rounded-xl border border-outline-variant bg-white p-3 text-left shadow-xl group-hover:block group-focus-within:block">
        <p className="mb-2 font-label-md text-label-md text-on-background">
          {day.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
        </p>
        {hasMeetings ? (
          <ul className="space-y-2">
            {day.meetings.map((meeting) => (
              <li key={meeting.id} className="flex gap-2 text-body-sm text-on-surface-variant">
                <span className="font-label-sm text-label-sm text-primary">{meeting.time}</span>
                <span className="min-w-0 flex-1">{meeting.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-on-surface-variant">No meetings scheduled.</p>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-label-md text-label-md uppercase text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-container-low p-4 text-center">
      <div className="font-headline-md text-headline-md font-bold text-on-background">{value}</div>
      <div className="mt-1 font-label-md text-label-md text-on-surface-variant">{label}</div>
    </div>
  );
}
