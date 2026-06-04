import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MaterialIcon } from "../components/material-icon";
import { PageIntro } from "../components/app-shell";
import { api } from "../lib/api";

const jobLinksSheetId = "1-4J-fEjdjHx43xzqpbo8Bqu0gsC4V9t5i8gHuvC0hgo";

export function ImportPage() {
  const { data: status } = useQuery({ queryKey: ["import-status"], queryFn: api.importStatus });
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const importInput = () => ({ spreadsheetId: spreadsheetId.trim() || undefined });
  const test = useMutation({ mutationFn: () => api.testImport(importInput()) });
  const preview = useMutation({ mutationFn: () => api.previewImport(importInput()) });
  const run = useMutation({ mutationFn: () => api.runImport(importInput()) });
  const mode = status?.mode ?? "disabled";
  const connected = mode === "connected";
  const displayedSheetId = spreadsheetId.trim() || (status?.sheetId ?? "1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM");

  return (
    <>
      <PageIntro title="Import & Migration" description="Sync your external data pipelines into your local source of truth." />
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-6 lg:col-span-7">
          <section className="rounded-xl border border-outline-variant bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary-container/20 p-2 text-primary">
                  <MaterialIcon name="grid_on" />
                </div>
                <h3 className="font-title-md text-title-md font-bold">Google Sheets Connection</h3>
              </div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-label-md text-label-md ${connected ? "bg-primary-container text-on-primary-container" : "bg-surface-container-high text-on-surface-variant"}`}>
                <span className={`h-2 w-2 rounded-full ${connected ? "bg-primary" : "bg-outline"}`} />
                {mode === "connected" ? "Connected" : "Disabled"}
              </span>
            </div>
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4">
              <code className="break-all font-geist text-body-md text-primary">https://docs.google.com/spreadsheets/d/{displayedSheetId}/edit</code>
            </div>
            <p className="mt-4 text-body-md text-on-surface-variant">{status?.message}</p>
            <div className="mt-5 grid gap-2">
              <label className="label" htmlFor="spreadsheet-id">Spreadsheet ID</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input id="spreadsheet-id" className="input flex-1 bg-surface-container-low" value={spreadsheetId} onChange={(event) => setSpreadsheetId(event.target.value)} placeholder={status?.sheetId ?? "Google Sheet ID"} />
                <button className="btn btn-secondary" onClick={() => setSpreadsheetId(jobLinksSheetId)}>
                  <MaterialIcon name="link" />
                  Use job links sheet
                </button>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn btn-secondary" onClick={() => test.mutate()}><MaterialIcon name="sync" />Test Connection</button>
              <button className="btn btn-secondary" onClick={() => preview.mutate()}><MaterialIcon name="visibility" />Preview Import</button>
              <button className="btn btn-primary" onClick={() => run.mutate()}><MaterialIcon name="download" />Import Opportunities</button>
            </div>
          </section>
          <div className="flex items-start gap-4 rounded-xl border border-secondary-container/30 bg-surface-container-high/50 p-4">
            <MaterialIcon name="info" className="text-secondary" />
            <p className="text-body-md text-on-background"><span className="font-bold">Note:</span> PostgreSQL is the source of truth. Google Sheets is used only for one-time or manual migration syncs.</p>
          </div>
        </div>
        <aside className="col-span-12 lg:col-span-5">
          <section className="flex h-full flex-col rounded-xl border border-outline-variant bg-white/80 p-6 shadow-sm backdrop-blur">
            <div className="mb-8 flex items-center gap-3">
              <MaterialIcon name="history" className="text-outline" />
              <h3 className="font-title-md text-title-md font-bold">Import Summary</h3>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-outline-variant pt-6 text-center">
              <Summary label="Created" value={run.data?.importLog.created ?? 0} tone="text-primary" />
              <Summary label="Updated" value={run.data?.importLog.updated ?? 0} tone="text-secondary" />
              <Summary label="Skipped" value={run.data?.importLog.skipped ?? 0} tone="text-outline" />
            </div>
            <div className="mt-8 rounded-lg bg-surface-container-low p-4 text-body-md text-on-surface-variant">
              Next scheduled sync: Not set (Manual only)
            </div>
          </section>
        </aside>
        <section className="col-span-12 overflow-hidden rounded-xl border border-outline-variant bg-white/80 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-low px-6 py-4">
            <h4 className="font-title-md text-title-md font-semibold">Preview / Import Log</h4>
            <span className="font-label-md text-label-md text-outline">GoogleSheetsImportService</span>
          </div>
          <pre className="max-h-96 overflow-auto p-6 font-geist text-xs text-on-surface-variant">{JSON.stringify(preview.data?.opportunities ?? run.data?.importLog?.results ?? test.data ?? [], null, 2)}</pre>
        </section>
      </div>
    </>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div><p className={`font-headline-lg text-headline-lg font-bold ${tone}`}>{value}</p><p className="font-label-md text-label-md text-outline">{label}</p></div>;
}
