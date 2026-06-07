import { useState } from "react";
import { MaterialIcon } from "./material-icon";
import type { ParserRunLogStatus } from "../lib/parser-run";
import { parserRunLogTone } from "../lib/parser-run";

export type AgentRunLogEntry = {
  id: string;
  message: string;
  status: ParserRunLogStatus;
};

export function AgentRunLog({ entries, defaultOpen = true }: { entries: AgentRunLogEntry[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="panel border border-outline-variant bg-surface-container-low/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h4 className="font-title-md text-title-md font-bold">Run Log</h4>
          <p className="font-body-md text-body-md text-on-surface-variant">Lightweight timeline from the current parser run.</p>
        </div>
        <button className="btn btn-secondary px-3 py-2" onClick={() => setOpen((value) => !value)}>
          <MaterialIcon name={open ? "expand_less" : "expand_more"} />
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open ? (
        <ol className="space-y-2">
          {entries.map((entry) => {
            const tone = parserRunLogTone[entry.status];

            return (
              <li key={entry.id} className={`flex items-start gap-3 rounded-lg bg-white px-3 py-2 ${tone.ring ?? ""}`}>
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                <span className={`font-body-md text-body-md ${tone.text}`}>{entry.message}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
