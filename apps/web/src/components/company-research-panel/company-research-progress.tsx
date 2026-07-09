import { MaterialIcon } from "@interviews-tracker/design-system";

import {
  companyResearchLogTone,
  companyResearchRunMeta,
  type CompanyResearchRunState,
  companyResearchStepMessages,
} from "../../lib/company-research";

type CompanyResearchProgressProps = {
  runState: CompanyResearchRunState;
  stageIndex: number;
  progress: number;
  currentStep: string;
  error: string | null;
};

export function CompanyResearchProgress({
  runState,
  stageIndex,
  progress,
  currentStep,
  error,
}: CompanyResearchProgressProps) {
  const loadingTone = companyResearchRunMeta[runState].tone;

  return (
    <div className="mt-6">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${loadingTone === "danger" ? "bg-error-container text-on-error-container" : loadingTone === "success" ? "bg-primary-container text-on-primary-container" : "bg-secondary-container text-on-secondary-container"}`}
        >
          {runState === "failed" ? (
            <MaterialIcon name="error" filled />
          ) : runState === "completed" ? (
            <MaterialIcon name="check_circle" filled />
          ) : (
            <span className="inline-flex h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-label-md text-label-md uppercase tracking-widest text-on-surface-variant">Research run</p>
          <h4 className="mt-1 font-title-md text-title-md font-bold">{companyResearchRunMeta[runState].label}</h4>
          <p className="mt-1 text-body-md text-on-surface-variant">{companyResearchRunMeta[runState].description}</p>
          {runState !== "completed" ? (
            <p className="mt-2 text-body-md text-on-surface-variant">Current step: {currentStep}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div
          className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${runState === "failed" ? "bg-error" : runState === "completed" ? "bg-primary" : "bg-secondary"}`}
          style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {companyResearchStepMessages.map((message, index) => {
          const status =
            runState === "failed"
              ? index <= stageIndex
                ? "error"
                : "pending"
              : runState === "completed"
                ? "done"
                : index < stageIndex
                  ? "done"
                  : index === stageIndex
                    ? "active"
                    : "pending";
          const tone = companyResearchLogTone[status];

          return (
            <li key={message} className={`flex items-start gap-3 rounded-lg bg-white px-3 py-2 ${tone.ring ?? ""}`}>
              <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
              <span className={`text-body-md ${tone.text}`}>{message}</span>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p className="mt-4 rounded-lg bg-error-container px-4 py-3 text-body-md text-on-error-container">{error}</p>
      ) : null}
    </div>
  );
}
