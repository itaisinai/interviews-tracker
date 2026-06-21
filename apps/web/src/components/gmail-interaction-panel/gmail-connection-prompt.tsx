import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

type GmailConnectionPromptProps = {
  configured: boolean;
  flowState: string;
  shouldReconnect: boolean;
  error: string | null;
  needsReconnect: boolean;
  onConnect: () => void;
};

/**
 * Gmail connection prompt UI - shows when not connected
 */
export function GmailConnectionPrompt({
  configured,
  flowState,
  shouldReconnect,
  error,
  needsReconnect,
  onConnect
}: GmailConnectionPromptProps) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-8">
      <div className="max-w-2xl">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <MaterialIcon name="mail" className="text-[24px]" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Connect Gmail
            </h3>
            <p className="text-sm text-neutral-600">
              Import interactions directly from your Gmail calendar invites and emails.
            </p>
          </div>
        </div>

        {!configured ? (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800">
            Gmail OAuth is not configured on this environment.
          </div>
        ) : (
          <LoadingButton
            className="px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
            loading={flowState === "connecting_gmail"}
            loadingLabel="Connecting..."
            onClick={onConnect}
          >
            <MaterialIcon name="link" className="text-[16px]" />
            {shouldReconnect ? "Reconnect Gmail" : "Connect Gmail"}
          </LoadingButton>
        )}

        {error && flowState === "failed" && (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50">
            <p className="font-medium text-sm text-red-900 mb-1">Connection failed</p>
            <p className="text-sm text-red-800">{error}</p>
            {needsReconnect && (
              <LoadingButton
                className="mt-3 px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 transition-colors"
                loading={false}
                onClick={onConnect}
              >
                Reconnect Gmail
              </LoadingButton>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
