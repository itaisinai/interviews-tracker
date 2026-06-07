import { MaterialIcon } from "./material-icon";
import type { ParserRunState } from "../lib/parser-run";
import { parserRunStateMeta } from "../lib/parser-run";

export function ParserLoadingState({ state, message, progress }: { state: Exclude<ParserRunState, "idle">; message?: string; progress: number }) {
  const meta = parserRunStateMeta[state];
  const fillClass = state === "failed" ? "bg-error" : state === "completed" ? "bg-primary" : "bg-secondary";

  return (
    <section className="panel border border-outline-variant bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
          {state === "failed" ? (
            <MaterialIcon name="error" filled />
          ) : state === "completed" ? (
            <MaterialIcon name="check_circle" filled />
          ) : (
            <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase text-on-surface-variant">Parser run</p>
          <h4 className="mt-1 font-title-md text-title-md font-bold">{meta.label}</h4>
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant">{message ?? meta.description}</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${fillClass}`}
          style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
        />
      </div>
    </section>
  );
}
