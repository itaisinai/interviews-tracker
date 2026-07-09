import crypto from "node:crypto";

import { getFirstFrontendOrigin, type GmailSettings } from "./gmail-settings.js";

export type GmailStatePayload = {
  auth0Email: string;
  returnTo: string;
  expiresAt: number;
  nonce: string;
};

export function deriveKey(secret: string) {
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptText(value: string, secret: string) {
  const key = deriveKey(secret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptText(value: string, secret: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");

  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error("Invalid encrypted Gmail token.");
  }

  const key = deriveKey(secret);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]);

  return decrypted.toString("utf8");
}

export function signState(payload: GmailStatePayload, secret: string) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", deriveKey(secret)).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyState(state: string, secret: string): GmailStatePayload {
  const [body, signature] = state.split(".");

  if (!body || !signature) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  const expected = crypto.createHmac("sha256", deriveKey(secret)).update(body).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length || !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<GmailStatePayload>;

  if (
    typeof parsed.auth0Email !== "string" ||
    typeof parsed.returnTo !== "string" ||
    typeof parsed.expiresAt !== "number" ||
    typeof parsed.nonce !== "string"
  ) {
    throw new Error("Invalid Gmail OAuth state.");
  }

  if (Date.now() > parsed.expiresAt) {
    throw new Error("Gmail OAuth state expired.");
  }

  return {
    auth0Email: parsed.auth0Email,
    returnTo: parsed.returnTo,
    expiresAt: parsed.expiresAt,
    nonce: parsed.nonce,
  };
}

export function normalizeReturnTo(returnTo?: string) {
  if (!returnTo) {
    return "/";
  }

  if (returnTo.startsWith("/")) {
    return returnTo;
  }

  try {
    const url = new URL(returnTo);
    const frontendOrigin = getFirstFrontendOrigin();

    if (`${url.origin}` === frontendOrigin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // fall through
  }

  return "/";
}

export function clientIdFingerprint(clientId: string) {
  if (clientId.length <= 8) {
    return { clientIdPrefix: clientId, clientIdSuffix: clientId };
  }

  return {
    clientIdPrefix: clientId.slice(0, 4),
    clientIdSuffix: clientId.slice(-4),
  };
}
