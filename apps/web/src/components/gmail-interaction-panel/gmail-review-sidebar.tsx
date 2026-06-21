import { Mail, Sparkles } from "lucide-react";
import type { GmailEmailExtractionAnalysis, GmailStructuredEmail } from "../../lib/types";

type GmailReviewSidebarProps = {
  selectedEmail: GmailStructuredEmail;
  analysis: GmailEmailExtractionAnalysis | null;
  confidencePercent: number;
};

export function GmailReviewSidebar({ selectedEmail, analysis, confidencePercent }: GmailReviewSidebarProps) {
  return (
    <div className="lg:w-80 space-y-4">
      <div className="p-4 rounded-xl border border-neutral-200 bg-white">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-1">
              Source Email
            </div>
            <h3 className="text-sm font-semibold text-neutral-900 leading-snug">
              {selectedEmail.subject}
            </h3>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          <div>
            <span className="text-neutral-500">From:</span>
            <p className="text-neutral-900 font-medium mt-0.5">{selectedEmail.fromRaw}</p>
          </div>
          <div>
            <span className="text-neutral-500">Received:</span>
            <p className="text-neutral-900 font-medium mt-0.5">
              {new Date(selectedEmail.internalDate).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
          <div>
            <span className="text-neutral-500">Confidence:</span>
            <p className="text-neutral-900 font-medium mt-0.5">
              <span className={`inline-flex items-center gap-1 ${
                confidencePercent >= 90 ? "text-emerald-600" :
                confidencePercent >= 70 ? "text-yellow-600" : "text-neutral-600"
              }`}>
                {confidencePercent}%
              </span>
            </p>
          </div>
        </div>

        {selectedEmail.snippet && (
          <div className="mt-3 pt-3 border-t border-neutral-100">
            <p className="text-xs text-neutral-600 line-clamp-3">
              {selectedEmail.snippet}
            </p>
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-neutral-50 text-xs text-neutral-600">
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 mt-0.5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-neutral-900 mb-1">AI Extraction</p>
            <p>
              {analysis?.dateSource === "calendar"
                ? "Details extracted from calendar invite"
                : analysis?.dateSource === "text"
                  ? "Details extracted from email text"
                  : "Details extracted from email metadata"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
