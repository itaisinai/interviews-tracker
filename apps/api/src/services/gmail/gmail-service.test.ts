import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { prisma } from "../../lib/prisma.js";
import { listTrackedGmailMessages, restoreHiddenGmailMessage, unmarkUsedGmailMessageState } from "./gmail-service.js";

function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

function encryptRefreshToken(value: string, secret: string) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

test("gmail tracked states include legacy null-scoped rows and can clear them", async () => {
  const originalEnv = {
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
    GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY
  };
  const originalFetch = globalThis.fetch;
  const gmailConnection = prisma.gmailConnection as any;
  const gmailMessageState = prisma.gmailMessageState as any;
  const originalFindUnique = gmailConnection.findUnique;
  const originalFindMany = gmailMessageState.findMany;
  const originalDeleteMany = gmailMessageState.deleteMany;
  const secret = "gmail-test-secret";
  const encryptedRefreshToken = encryptRefreshToken("refresh-token", secret);
  const seenWhere: Array<Record<string, unknown>> = [];
  const deleteWheres: Array<Record<string, unknown>> = [];

  process.env.GMAIL_CLIENT_ID = "client-id";
  process.env.GMAIL_CLIENT_SECRET = "client-secret";
  process.env.GMAIL_REDIRECT_URI = "http://localhost/callback";
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = secret;

  gmailConnection.findUnique = (async () => ({
    auth0Email: "user@example.com",
    refreshTokenEncrypted: encryptedRefreshToken,
    googleEmail: "user@example.com",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    createdAt: new Date(),
    updatedAt: new Date()
  })) as typeof gmailConnection.findUnique;

  gmailMessageState.findMany = (async (args: { where?: Record<string, unknown> }) => {
    seenWhere.push(args.where ?? {});
    return [
      { messageId: "legacy-hidden", status: "HIDDEN" },
      { messageId: "legacy-used", status: "USED" }
    ];
  }) as typeof gmailMessageState.findMany;

  gmailMessageState.deleteMany = (async (args: { where?: Record<string, unknown> }) => {
    deleteWheres.push(args.where ?? {});
    return { count: 1 };
  }) as typeof gmailMessageState.deleteMany;

  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "access-token" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.includes("/messages/legacy-hidden")) {
      return new Response(JSON.stringify({
        id: "legacy-hidden",
        threadId: "thread-1",
        internalDate: "1750000000000",
        payload: { headers: [{ name: "Subject", value: "Hidden subject" }, { name: "Date", value: "Mon, 14 Jun 2026 10:00:00 +0300" }] }
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      id: "legacy-used",
      threadId: "thread-2",
      internalDate: "1750000100000",
      payload: { headers: [{ name: "Subject", value: "Used subject" }, { name: "Date", value: "Mon, 14 Jun 2026 10:10:00 +0300" }] }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }) as typeof fetch;

  try {
    const tracked = await listTrackedGmailMessages({
      auth0Email: "user@example.com",
      jobOpportunityId: "opportunity-1"
    });

    assert.equal(seenWhere.length, 1);
    assert.deepEqual(seenWhere[0]?.OR, [
      { jobOpportunityId: "opportunity-1" },
      { jobOpportunityId: null }
    ]);
    assert.deepEqual(tracked.removedEmails.map((email) => email.id), ["legacy-hidden"]);
    assert.deepEqual(tracked.pickedEmails.map((email) => email.id), ["legacy-used"]);

    await restoreHiddenGmailMessage({
      auth0Email: "user@example.com",
      messageId: "legacy-hidden",
      jobOpportunityId: "opportunity-1"
    });
    await unmarkUsedGmailMessageState({
      auth0Email: "user@example.com",
      messageId: "legacy-used",
      jobOpportunityId: "opportunity-1"
    });

    assert.equal(deleteWheres.length, 2);
    for (const where of deleteWheres) {
      assert.equal(where?.status === "HIDDEN" || where?.status === "USED", true);
      assert.deepEqual(where?.OR, [
        { jobOpportunityId: "opportunity-1" },
        { jobOpportunityId: null }
      ]);
    }
  } finally {
    globalThis.fetch = originalFetch;
    gmailConnection.findUnique = originalFindUnique;
    gmailMessageState.findMany = originalFindMany;
    gmailMessageState.deleteMany = originalDeleteMany;
    process.env.GMAIL_CLIENT_ID = originalEnv.GMAIL_CLIENT_ID;
    process.env.GMAIL_CLIENT_SECRET = originalEnv.GMAIL_CLIENT_SECRET;
    process.env.GMAIL_REDIRECT_URI = originalEnv.GMAIL_REDIRECT_URI;
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = originalEnv.GMAIL_TOKEN_ENCRYPTION_KEY;
  }
});

test("gmail invalid_grant marks connection as reconnect required and maps cleanly", async () => {
  const originalEnv = {
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
    GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY
  };
  const originalFetch = globalThis.fetch;
  const gmailConnection = prisma.gmailConnection as any;
  const originalFindUnique = gmailConnection.findUnique;
  const originalUpdate = gmailConnection.update;
  const secret = "gmail-test-secret";
  const encryptedRefreshToken = encryptRefreshToken("revoked-refresh-token", secret);
  const updates: Array<Record<string, unknown>> = [];

  process.env.GMAIL_CLIENT_ID = "client-id-123456";
  process.env.GMAIL_CLIENT_SECRET = "client-secret";
  process.env.GMAIL_REDIRECT_URI = "http://localhost/callback";
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = secret;

  gmailConnection.findUnique = (async () => ({
    auth0Email: "user@example.com",
    refreshTokenEncrypted: encryptedRefreshToken,
    googleEmail: "gmail@example.com",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    needsReconnect: false,
    lastError: null,
    connectedAt: new Date(),
    updatedAt: new Date()
  })) as typeof gmailConnection.findUnique;

  gmailConnection.update = (async (args: { data?: Record<string, unknown> }) => {
    updates.push(args.data ?? {});
    return {};
  }) as typeof gmailConnection.update;

  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const { searchGmailMessages, GmailReconnectRequiredError, GMAIL_RECONNECT_REQUIRED_MESSAGE } = await import("./gmail-service.js");

    await assert.rejects(
      () => searchGmailMessages({
        auth0Email: "user@example.com",
        jobOpportunityId: "opportunity-1",
        companyName: "Example Corp"
      }),
      (error) => error instanceof GmailReconnectRequiredError
    );

    assert.deepEqual(updates.at(-1), {
      needsReconnect: true,
      lastError: GMAIL_RECONNECT_REQUIRED_MESSAGE
    });
  } finally {
    globalThis.fetch = originalFetch;
    gmailConnection.findUnique = originalFindUnique;
    gmailConnection.update = originalUpdate;
    process.env.GMAIL_CLIENT_ID = originalEnv.GMAIL_CLIENT_ID;
    process.env.GMAIL_CLIENT_SECRET = originalEnv.GMAIL_CLIENT_SECRET;
    process.env.GMAIL_REDIRECT_URI = originalEnv.GMAIL_REDIRECT_URI;
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = originalEnv.GMAIL_TOKEN_ENCRYPTION_KEY;
  }
});

test("gmail status reports reconnect-required state", async () => {
  const originalEnv = {
    GMAIL_CLIENT_ID: process.env.GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI: process.env.GMAIL_REDIRECT_URI,
    GMAIL_TOKEN_ENCRYPTION_KEY: process.env.GMAIL_TOKEN_ENCRYPTION_KEY
  };
  const gmailConnection = prisma.gmailConnection as any;
  const originalFindUnique = gmailConnection.findUnique;
  const connectedAt = new Date("2026-06-14T10:00:00.000Z");
  const updatedAt = new Date("2026-06-14T10:05:00.000Z");

  process.env.GMAIL_CLIENT_ID = "client-id";
  process.env.GMAIL_CLIENT_SECRET = "client-secret";
  process.env.GMAIL_REDIRECT_URI = "http://localhost/callback";
  process.env.GMAIL_TOKEN_ENCRYPTION_KEY = "gmail-test-secret";

  gmailConnection.findUnique = (async () => ({
    auth0Email: "user@example.com",
    googleEmail: "gmail@example.com",
    scope: "scope-a scope-b",
    needsReconnect: true,
    lastError: "Your Gmail connection expired or was revoked. Please reconnect Gmail.",
    connectedAt,
    updatedAt
  })) as typeof gmailConnection.findUnique;

  try {
    const { getGmailStatus } = await import("./gmail-service.js");
    const status = await getGmailStatus("user@example.com");

    assert.equal(status.configured, true);
    assert.equal(status.connected, false);
    assert.equal(status.needsReconnect, true);
    assert.equal(status.lastError, "Your Gmail connection expired or was revoked. Please reconnect Gmail.");
    assert.equal(status.lastConnectedAt, connectedAt.toISOString());
    assert.deepEqual(status.scopes, ["scope-a", "scope-b"]);
    assert.equal(status.updatedAt, updatedAt.toISOString());
  } finally {
    gmailConnection.findUnique = originalFindUnique;
    process.env.GMAIL_CLIENT_ID = originalEnv.GMAIL_CLIENT_ID;
    process.env.GMAIL_CLIENT_SECRET = originalEnv.GMAIL_CLIENT_SECRET;
    process.env.GMAIL_REDIRECT_URI = originalEnv.GMAIL_REDIRECT_URI;
    process.env.GMAIL_TOKEN_ENCRYPTION_KEY = originalEnv.GMAIL_TOKEN_ENCRYPTION_KEY;
  }
});

test("gmail reconnect callback requires a newly returned refresh token before clearing reconnect state", async () => {
  const { getRefreshTokenForOAuthCallback } = await import("./gmail-service.js");
  const encryptedRefreshToken = encryptRefreshToken("old-revoked-refresh-token", "gmail-test-secret");

  assert.throws(
    () => getRefreshTokenForOAuthCallback({
      tokens: { access_token: "access-token" },
      existingConnection: {
        refreshTokenEncrypted: encryptedRefreshToken,
        googleEmail: "old@gmail.com",
        needsReconnect: true
      },
      nextGoogleEmail: "old@gmail.com",
      settings: { encryptionSecret: "gmail-test-secret" }
    }),
    /did not return a new refresh token/
  );
});

test("gmail healthy callback can preserve the existing refresh token when Google omits one for the same account", async () => {
  const { getRefreshTokenForOAuthCallback } = await import("./gmail-service.js");
  const encryptedRefreshToken = encryptRefreshToken("still-valid-refresh-token", "gmail-test-secret");

  const refreshToken = getRefreshTokenForOAuthCallback({
    tokens: { access_token: "access-token" },
    existingConnection: {
      refreshTokenEncrypted: encryptedRefreshToken,
      googleEmail: "same@gmail.com",
      needsReconnect: false
    },
    nextGoogleEmail: "same@gmail.com",
    settings: { encryptionSecret: "gmail-test-secret" }
  });

  assert.equal(refreshToken, "still-valid-refresh-token");
});

test("gmail callback fallback verifies the preserved refresh token before clearing reconnect state", async () => {
  const originalFetch = globalThis.fetch;
  const gmailConnection = prisma.gmailConnection as any;
  const originalUpdate = gmailConnection.update;
  const encryptedRefreshToken = encryptRefreshToken("silently-revoked-refresh-token", "gmail-test-secret");
  const updates: Array<Record<string, unknown>> = [];

  gmailConnection.update = (async (args: { data?: Record<string, unknown> }) => {
    updates.push(args.data ?? {});
    return {};
  }) as typeof gmailConnection.update;

  globalThis.fetch = (async (input) => {
    const url = String(input);

    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked."
      }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;

  try {
    const { resolveRefreshTokenForOAuthCallback, GmailReconnectRequiredError, GMAIL_RECONNECT_REQUIRED_MESSAGE } = await import("./gmail-service.js");

    await assert.rejects(
      () => resolveRefreshTokenForOAuthCallback({
        auth0Email: "user@example.com",
        tokens: { access_token: "access-token" },
        existingConnection: {
          refreshTokenEncrypted: encryptedRefreshToken,
          googleEmail: "same@gmail.com",
          needsReconnect: false
        },
        nextGoogleEmail: "same@gmail.com",
        settings: {
          clientId: "client-id-123456",
          clientSecret: "client-secret",
          redirectUri: "http://localhost/callback",
          encryptionSecret: "gmail-test-secret",
          frontendOrigin: "http://localhost:5173"
        }
      }),
      (error) => error instanceof GmailReconnectRequiredError
    );

    assert.deepEqual(updates.at(-1), {
      needsReconnect: true,
      lastError: GMAIL_RECONNECT_REQUIRED_MESSAGE
    });
  } finally {
    globalThis.fetch = originalFetch;
    gmailConnection.update = originalUpdate;
  }
});
