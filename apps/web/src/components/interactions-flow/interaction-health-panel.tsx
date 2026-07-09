import type { Interaction } from "../../lib/types";

import { countUpcoming } from "./interaction-flow-helpers";

type InteractionHealthPanelProps = {
  interactions: readonly Interaction[];
  followUpCount: number;
  followUpPercent: number;
};

export function InteractionHealthPanel({ interactions, followUpCount, followUpPercent }: InteractionHealthPanelProps) {
  return (
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
        <StatCard label="Total" value={interactions.length} />
        <StatCard label="Upcoming" value={countUpcoming(interactions)} />
        <StatCard label="Passed" value={interactions.filter((item) => item.status === "DONE").length} />
        <StatCard label="Waiting" value={followUpCount} />
      </div>
    </div>
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
