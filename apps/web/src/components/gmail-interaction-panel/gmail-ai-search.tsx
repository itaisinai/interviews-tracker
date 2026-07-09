import { Check, Loader2, Sparkles } from "lucide-react";

type GmailAiSearchProps = {
  companyName: string;
  stage: "searching" | "matching" | "found" | "parsing";
  progress: number;
};

export function GmailAiSearch({ companyName, stage, progress }: GmailAiSearchProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="max-w-md w-full space-y-8">
        {/* AI Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            {stage !== "found" && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-3">
          <Step label={`Searching Gmail for ${companyName}`} status={stage === "searching" ? "active" : "complete"} />
          <Step
            label="Finding most relevant email"
            status={stage === "searching" ? "pending" : stage === "matching" ? "active" : "complete"}
          />
          <Step
            label="Extracting interaction details"
            status={
              stage === "searching" || stage === "matching" ? "pending" : stage === "parsing" ? "active" : "complete"
            }
          />
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {stage === "found" && (
          <div className="text-center">
            <p className="text-sm text-neutral-600">Preparing changes for review...</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ label, status }: { label: string; status: "pending" | "active" | "complete" }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
          status === "complete"
            ? "bg-emerald-100 text-emerald-600"
            : status === "active"
              ? "bg-emerald-50 text-emerald-600"
              : "bg-neutral-100 text-neutral-400"
        }`}
      >
        {status === "complete" ? (
          <Check className="w-3 h-3" />
        ) : status === "active" ? (
          <div className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-neutral-300" />
        )}
      </div>
      <span
        className={`text-sm transition-colors ${
          status === "complete" || status === "active" ? "text-neutral-900 font-medium" : "text-neutral-500"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
