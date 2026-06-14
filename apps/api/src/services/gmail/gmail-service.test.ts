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
