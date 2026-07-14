import { useMemo, useState } from "react";

import { Button, MaterialIcon } from "@interviews-tracker/design-system";

import { ParserLoadingState } from "../../../components/parser-loading-state/parser-loading-state";
import { labelForJobStatus, labelForPipelineType, labelForPriority } from "../../../lib/enum-labels";
import type { ParserRunState } from "../../../lib/parser-run";
import type { Option, PipelineType, Priority } from "../../../lib/types";
import type { ParsedJobDescription, SourceMode } from "../types";
import { normalizeJobStatus } from "../utils";

import { ValueRow } from "./value-row";

interface ReviewPanelProps {
  sourceMode: SourceMode;
  isBusy: boolean;
  runState: ParserRunState;
  statusMessage: string;
  progress: number;
  runError: string | null;
  createError: Error | null;
  parseResult: ParsedJobDescription | null;
  companySizeOption: Option | null;
  companyStageOption: Option | null;
  workModelOption: Option | null;
  parsedDomains: string[];
  canSave: boolean;
  onUpdateParseResult: (updates: Partial<ParsedJobDescription>) => void;
}

export function ReviewPanel({
  sourceMode,
  isBusy,
  runState,
  statusMessage,
  progress,
  runError,
  createError,
  parseResult,
  companySizeOption,
  companyStageOption,
  workModelOption,
  parsedDomains,
  canSave,
  onUpdateParseResult,
}: ReviewPanelProps) {
  const [editingCompany, setEditingCompany] = useState(false);
  const [editingRole, setEditingRole] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");

  const pipelineType = (parseResult?.pipelineType ?? "POTENTIAL") as PipelineType;
  const priority = (parseResult?.prioritySuggestion ?? "MEDIUM") as Priority;

  return (
    <section className="panel p-6">
      <div className="mb-4">
        <h3 className="font-title-lg text-title-lg font-bold">Review & Parse</h3>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {sourceMode === "raw-text"
            ? "The content will appear here and be parsed."
            : "The content from selected emails will appear here."}
        </p>
      </div>

      {/* Loading and Error States */}
      {isBusy && runState !== "idle" ? (
        <div className="mb-4">
          <ParserLoadingState state={runState} message={statusMessage} progress={progress} />
        </div>
      ) : null}

      {runError ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Parsing failed</p>
          <p className="mt-1 font-body-md text-body-md">{runError}</p>
        </div>
      ) : null}

      {createError ? (
        <div className="mb-4 rounded-lg border border-error/30 bg-error-container px-4 py-3 text-on-error-container">
          <p className="font-body-md text-body-md font-semibold">Save failed</p>
          <p className="mt-1 font-body-md text-body-md">
            {createError instanceof Error ? createError.message : "Unable to save the opportunity."}
          </p>
        </div>
      ) : null}

      {/* Parsed Result */}
      {parseResult ? (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-container px-3 py-1 font-label-md text-label-md text-on-primary-container">
              {labelForPipelineType(pipelineType)}
            </span>
            <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
              {labelForJobStatus(normalizeJobStatus(parseResult.status))}
            </span>
            <span className="rounded-full bg-surface-container-high px-3 py-1 font-label-md text-label-md text-on-surface-variant">
              {labelForPriority(priority)}
            </span>
          </div>
          {!canSave ? (
            <div className="mb-4 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-on-warning-container">
              The parser must extract both a company name and a role title before this can be saved.
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="label mb-2">Company</p>
              {editingCompany ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="Company name"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="check"
                    onClick={() => {
                      onUpdateParseResult({ companyName: companyName.trim() });
                      setEditingCompany(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="close"
                    onClick={() => {
                      setEditingCompany(false);
                      setCompanyName(parseResult.companyName ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="value flex-1">{parseResult.companyName ?? "-"}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="edit"
                    onClick={() => {
                      setCompanyName(parseResult.companyName ?? "");
                      setEditingCompany(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
            <div>
              <p className="label mb-2">Role</p>
              {editingRole ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    className="flex-1 rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-body-md outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    placeholder="Role title"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="check"
                    onClick={() => {
                      onUpdateParseResult({ roleTitle: roleTitle.trim() });
                      setEditingRole(false);
                    }}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="close"
                    onClick={() => {
                      setEditingRole(false);
                      setRoleTitle(parseResult.roleTitle ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="value flex-1">{parseResult.roleTitle ?? "-"}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    leadingIcon="edit"
                    onClick={() => {
                      setRoleTitle(parseResult.roleTitle ?? "");
                      setEditingRole(true);
                    }}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
            <ValueRow label="Status" value={labelForJobStatus(normalizeJobStatus(parseResult.status))} />
            <ValueRow label="Priority" value={labelForPriority(priority)} />
            <ValueRow label="Company size" value={companySizeOption?.label ?? parseResult.company.employees ?? "-"} />
            <ValueRow label="Stage" value={companyStageOption?.label ?? parseResult.company.stage ?? "-"} />
            <ValueRow label="Work model" value={workModelOption?.label ?? parseResult.company.workModel ?? "-"} />
            <ValueRow label="Location" value={parseResult.company.location ?? "-"} />
            <ValueRow label="Known contact" value={parseResult.process.knownContact ?? "-"} />
            <ValueRow label="Next step" value={parseResult.process.suggestedNextStep ?? "-"} />
            <ValueRow label="Company description" value={parseResult.company.companyDescription ?? "-"} />
            <ValueRow label="Product description" value={parseResult.company.productDescription ?? "-"} />
          </div>
          <div className="mt-4">
            <p className="label">Domains</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {parsedDomains.length > 0 ? (
                parsedDomains.map((domain) => (
                  <span
                    key={domain}
                    className="rounded-full bg-secondary-container px-3 py-1 font-label-md text-label-md text-on-secondary-container"
                  >
                    {domain}
                  </span>
                ))
              ) : (
                <span className="text-body-md text-on-surface-variant">-</span>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ValueRow
              label="Tech stack"
              value={parseResult.role.techStack.length > 0 ? parseResult.role.techStack.join(", ") : "-"}
            />
            <ValueRow label="Backend / frontend split" value={parseResult.role.backendFrontendSplit ?? "-"} />
            <ValueRow label="Compensation" value={parseResult.role.compensation ?? "-"} />
            <ValueRow label="Customers / traction" value={parseResult.company.customersTraction ?? "-"} />
          </div>
          {parseResult.rawImportantNotes.length > 0 ? (
            <div className="mt-4">
              <p className="label">Important notes</p>
              <ul className="mt-2 space-y-2 rounded-xl bg-surface-container-low p-4">
                {parseResult.rawImportantNotes.map((note) => (
                  <li key={note} className="text-body-md text-on-background">
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="mt-4 text-body-md text-on-surface-variant">
            The parser will auto-create missing domains and map company size, stage, and work model when the labels
            match existing options.
          </p>
        </>
      ) : (
        /* Empty State */
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
          <MaterialIcon name="description" className="mb-4 text-5xl text-on-surface-variant" />
          <p className="mb-2 font-title-md text-title-md font-medium text-on-surface">No content yet</p>
          <p className="text-body-sm text-on-surface-variant">
            {sourceMode === "raw-text"
              ? "Paste text on the left to see parsed details here."
              : "Select email(s) from the left to add their content and parse the opportunity."}
          </p>
        </div>
      )}
    </section>
  );
}
