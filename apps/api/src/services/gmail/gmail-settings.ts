export type GmailSettings = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  encryptionSecret: string;
  frontendOrigin: string;
};

export function getFirstFrontendOrigin() {
  return (process.env.FRONTEND_ORIGIN ?? "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .find(Boolean) ?? "http://localhost:5173";
}

export function getSettings(): GmailSettings | null {
  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const redirectUri = process.env.GMAIL_REDIRECT_URI;
  const encryptionSecret = process.env.GMAIL_TOKEN_ENCRYPTION_KEY;

  if (!clientId || !clientSecret || !redirectUri || !encryptionSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    encryptionSecret,
    frontendOrigin: getFirstFrontendOrigin()
  };
}

export function requireSettings() {
  const settings = getSettings();

  if (!settings) {
    throw new Error("Gmail OAuth is not configured.");
  }

  return settings;
}
