import type { UseMutationResult } from "@tanstack/react-query";

import { LoadingButton, MaterialIcon } from "@interviews-tracker/design-system";

interface GmailConnectPromptProps {
  gmailConnect: UseMutationResult<{ authUrl: string }, Error, void>;
}

export function GmailConnectPrompt({ gmailConnect }: GmailConnectPromptProps) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low p-8 text-center">
      <MaterialIcon name="mail" className="mb-4 text-5xl text-on-surface-variant" />
      <p className="mb-4 font-title-md text-title-md font-medium text-on-surface">Connect your Gmail account</p>
      <LoadingButton
        className="btn btn-primary"
        loading={gmailConnect.isPending}
        loadingLabel="Connecting..."
        icon="link"
        onClick={() => gmailConnect.mutate()}
      >
        Connect Gmail
      </LoadingButton>
    </div>
  );
}
