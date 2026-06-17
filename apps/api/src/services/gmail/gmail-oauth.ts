import crypto from "node:crypto";

import { createTimer, logError, logInfo } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { fetchJson, GmailApiRequestError } from "./gmail-http.js";
import {
  clientIdFingerprint,
  decryptText,
  encryptText,
  normalizeReturnTo,
  signState,
  verifyState,
} from "./gmail-crypto.js";
import { getSettings, requireSettings, type GmailSettings } from "./gmail-settings.js";
import type { GmailAttachmentResponse, GmailProfileResponse } from "./gmail-message-utils.js";

export type GmailStatus = {
  configured: boolean;
  connected: boolean;
  needsReconnect: boolean;
  googleEmail: string | null;
  lastError?: string | null;
  lastConnectedAt?: string | null;
  updatedAt: string | null;
  scopes?: string[];
};

export const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
export const STATE_TTL_MS = 10 * 60 * 1000;
export const GMAIL_RECONNECT_REQUIRED_CODE = "GMAIL_RECONNECT_REQUIRED";
export const GMAIL_RECONNECT_REQUIRED_MESSAGE = "Your Gmail connection expired or was revoked. Please reconnect Gmail.";

export class GmailReconnectRequiredError extends Error {
  code = GMAIL_RECONNECT_REQUIRED_CODE;
  statusCode = 401;

  constructor(message = GMAIL_RECONNECT_REQUIRED_MESSAGE) {
    super(message);
    this.name = "GmailReconnectRequiredError";
  }
}

type GmailTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

type GmailOAuthTokenBundle = {
  access_token: string;
  refresh_token?: string;
  scope?: string;
};

type GmailConnectionForReconnect = {
  refreshTokenEncrypted: string;
  googleEmail: string | null;
  needsReconnect: boolean;
};

export async function fetchGmailProfile(accessToken: string) {
  return fetchJson<GmailProfileResponse>("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function fetchGmailAttachment(messageId: string, attachmentId: string, accessToken: string) {
  return fetchJson<GmailAttachmentResponse>(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function exchangeCodeForTokens(code: string, settings: GmailSettings): Promise<GmailOAuthTokenBundle> {
  const response = await fetchJson<GmailTokenResponse>("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: settings.clientId,
      client_secret: settings.clientSecret,
      redirect_uri: settings.redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.access_token) {
    throw new Error("Gmail OAuth did not return an access token.");
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    scope: response.scope
  };
}

async function refreshAccessToken(input: { auth0Email: string; googleEmail?: string | null; refreshToken: string; settings: GmailSettings }): Promise<string> {
  const { auth0Email, googleEmail, refreshToken, settings } = input;
  logInfo("gmail", "refreshing access token", {
    auth0Email,
    googleEmail: googleEmail ?? null,
    hasRefreshToken: Boolean(refreshToken),
    refreshTokenLength: refreshToken.length,
    ...clientIdFingerprint(settings.clientId)
  });

  try {
    const response = await fetchJson<GmailTokenResponse>("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
        grant_type: "refresh_token"
      })
    });

    const accessToken = response.access_token;

    if (!accessToken) {
      throw new Error("Unable to refresh Gmail access token.");
    }

    return accessToken;
  } catch (error) {
    if (error instanceof GmailApiRequestError) {
      logError("gmail", "access token refresh failed", {
        auth0Email,
        googleEmail: googleEmail ?? null,
        hasRefreshToken: Boolean(refreshToken),
        refreshTokenLength: refreshToken.length,
        ...clientIdFingerprint(settings.clientId),
        status: error.status,
        errorCode: error.googleError ?? null,
        errorDescription: error.googleErrorDescription ?? null
      });
    }

    throw error;
  }
}

export async function getAccessTokenForEmail(auth0Email: string, settings = requireSettings()) {
  const connection = await prisma.gmailConnection.findUnique({ where: { auth0Email } });

  if (!connection) {
    return null;
  }

  const refreshToken = decryptText(connection.refreshTokenEncrypted, settings.encryptionSecret);

  try {
    const accessToken = await refreshAccessToken({
      auth0Email,
      googleEmail: connection.googleEmail,
      refreshToken,
      settings
    });

    const reconnectState = connection as typeof connection & { needsReconnect?: boolean; lastError?: string | null };

    if (reconnectState.needsReconnect || reconnectState.lastError) {
      await prisma.gmailConnection.update({
        where: { auth0Email },
        data: { needsReconnect: false, lastError: null }
      });
    }

    return { accessToken, connection };
  } catch (error) {
    if (error instanceof GmailApiRequestError && error.googleError === "invalid_grant") {
      await prisma.gmailConnection.update({
        where: { auth0Email },
        data: { needsReconnect: true, lastError: GMAIL_RECONNECT_REQUIRED_MESSAGE }
      });
      throw new GmailReconnectRequiredError();
    }

    throw error;
  }
}

export function createGmailAuthUrl(auth0Email: string, returnTo?: string) {
  const settings = requireSettings();
  const state = signState(
    {
      auth0Email,
      returnTo: normalizeReturnTo(returnTo),
      expiresAt: Date.now() + STATE_TTL_MS,
      nonce: crypto.randomBytes(16).toString("base64url")
    },
    settings.encryptionSecret
  );

  const params = new URLSearchParams({
    client_id: settings.clientId,
    redirect_uri: settings.redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: auth0Email,
    state
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function getGmailStatus(auth0Email: string) {
  const settings = getSettings();
  if (!settings) {
    return {
      configured: false,
      connected: false,
      needsReconnect: false,
      googleEmail: null,
      lastError: null,
      lastConnectedAt: null,
      updatedAt: null,
      scopes: []
    };
  }

  const connection = await prisma.gmailConnection.findUnique({ where: { auth0Email } });

  return {
    configured: true,
    connected: Boolean(connection && !(connection as typeof connection & { needsReconnect?: boolean }).needsReconnect),
    needsReconnect: Boolean((connection as typeof connection & { needsReconnect?: boolean } | null)?.needsReconnect),
    googleEmail: connection?.googleEmail ?? null,
    lastError: (connection as typeof connection & { lastError?: string | null } | null)?.lastError ?? null,
    lastConnectedAt: connection?.connectedAt?.toISOString() ?? null,
    updatedAt: connection?.updatedAt?.toISOString() ?? null,
    scopes: connection?.scope?.split(/\s+/).filter(Boolean) ?? []
  };
}

export async function resolveRefreshTokenForOAuthCallback(input: {
  auth0Email: string;
  tokens: GmailOAuthTokenBundle;
  existingConnection: GmailConnectionForReconnect | null;
  nextGoogleEmail: string | null;
  settings: GmailSettings;
}) {
  const { auth0Email, tokens, existingConnection, nextGoogleEmail, settings } = input;

  if (tokens.refresh_token) {
    return tokens.refresh_token;
  }

  if (!existingConnection) {
    throw new Error("Gmail OAuth did not return a refresh token.");
  }

  if (existingConnection.needsReconnect) {
    throw new Error("Gmail reconnect did not return a new refresh token. Please retry Gmail reconnect and approve the Google consent screen.");
  }

  if (existingConnection.googleEmail && nextGoogleEmail && existingConnection.googleEmail !== nextGoogleEmail) {
    throw new Error("Gmail OAuth did not return a refresh token for the selected Google account. Please retry Gmail reconnect and approve the Google consent screen.");
  }

  const existingRefreshToken = decryptText(existingConnection.refreshTokenEncrypted, settings.encryptionSecret);

  try {
    await refreshAccessToken({
      auth0Email,
      googleEmail: existingConnection.googleEmail,
      refreshToken: existingRefreshToken,
      settings
    });
  } catch (error) {
    if (error instanceof GmailApiRequestError && error.googleError === "invalid_grant") {
      await prisma.gmailConnection.update({
        where: { auth0Email },
        data: { needsReconnect: true, lastError: GMAIL_RECONNECT_REQUIRED_MESSAGE }
      });
      throw new GmailReconnectRequiredError();
    }

    throw error;
  }

  return existingRefreshToken;
}

export function getRefreshTokenForOAuthCallback(input: {
  tokens: GmailOAuthTokenBundle;
  existingConnection: GmailConnectionForReconnect | null;
  nextGoogleEmail: string | null;
  settings: Pick<GmailSettings, "encryptionSecret">;
}) {
  const { tokens, existingConnection, nextGoogleEmail, settings } = input;

  if (tokens.refresh_token) {
    return tokens.refresh_token;
  }

  if (!existingConnection) {
    throw new Error("Gmail OAuth did not return a refresh token.");
  }

  if (existingConnection.needsReconnect) {
    throw new Error("Gmail reconnect did not return a new refresh token. Please retry Gmail reconnect and approve the Google consent screen.");
  }

  if (existingConnection.googleEmail && nextGoogleEmail && existingConnection.googleEmail !== nextGoogleEmail) {
    throw new Error("Gmail OAuth did not return a refresh token for the selected Google account. Please retry Gmail reconnect and approve the Google consent screen.");
  }

  return decryptText(existingConnection.refreshTokenEncrypted, settings.encryptionSecret);
}

export async function completeGmailOAuth(code: string, state: string) {
  const settings = requireSettings();
  const timer = createTimer("gmail", "connect", {});
  try {
    const parsedState = verifyState(state, settings.encryptionSecret);
    const tokens = await exchangeCodeForTokens(code, settings);
    const existingConnection = await prisma.gmailConnection.findUnique({
      where: { auth0Email: parsedState.auth0Email }
    });
    const profile = await fetchGmailProfile(tokens.access_token);
    const refreshToken = await resolveRefreshTokenForOAuthCallback({
      auth0Email: parsedState.auth0Email,
      tokens,
      existingConnection: existingConnection as GmailConnectionForReconnect | null,
      nextGoogleEmail: profile.emailAddress ?? null,
      settings
    });

    await prisma.gmailConnection.upsert({
      where: { auth0Email: parsedState.auth0Email },
      create: {
        auth0Email: parsedState.auth0Email,
        googleEmail: profile.emailAddress ?? null,
        refreshTokenEncrypted: encryptText(refreshToken, settings.encryptionSecret),
        scope: tokens.scope ?? GMAIL_SCOPE,
        lastError: null,
        needsReconnect: false
      },
      update: {
        googleEmail: profile.emailAddress ?? null,
        refreshTokenEncrypted: encryptText(refreshToken, settings.encryptionSecret),
        scope: tokens.scope ?? GMAIL_SCOPE,
        lastError: null,
        needsReconnect: false,
        connectedAt: new Date()
      }
    });

    const redirectTo = new URL(parsedState.returnTo, settings.frontendOrigin).toString();
    timer.end({ email: parsedState.auth0Email });
    return { redirectTo };
  } catch (error) {
    timer.fail(error);
    throw error;
  }
}

export async function handleGmailCallback(input: { code?: string; state?: string; error?: string }) {
  const state = input.state ?? "";

  if (input.error) {
    const settings = requireSettings();
    const redirectTo = new URL("/", settings.frontendOrigin).toString();
    const url = new URL(redirectTo);
    url.searchParams.set("gmailError", input.error);
    return { redirectTo: url.toString() };
  }

  if (!input.code || !state) {
    throw new Error("Missing Gmail OAuth code or state.");
  }

  return completeGmailOAuth(input.code, state);
}

export async function disconnectGmail(auth0Email: string) {
  await prisma.gmailConnection.deleteMany({ where: { auth0Email } });
}

export function getGmailConnectionConfigured() {
  return Boolean(getSettings());
}

export type {
  GmailConnectionForReconnect,
  GmailOAuthTokenBundle,
  GmailTokenResponse
};
