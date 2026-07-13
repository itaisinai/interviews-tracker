import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";

import { getDevModeUserEmail, isDevModeEnabled } from "./dev-mode.js";
import { logger } from "./logger.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      email: string;
    };
  }
}

const bearerPrefix = "Bearer ";
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
}

function getAuthConfig() {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;

  if (!domain || !audience) {
    return undefined;
  }

  const normalizedDomain = normalizeDomain(domain);

  // Optional: allowlist of permitted emails (comma-separated)
  // If not set or empty, all authenticated users are allowed
  const allowedEmails = process.env.ALLOWED_EMAILS?.trim()
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return {
    audience,
    allowedEmails: allowedEmails && allowedEmails.length > 0 ? new Set(allowedEmails) : undefined,
    issuer: `https://${normalizedDomain}/`,
    jwksUrl: new URL(`https://${normalizedDomain}/.well-known/jwks.json`),
  };
}

function getStringClaim(payload: JWTPayload, key: string) {
  const claim = payload[key];
  return typeof claim === "string" ? claim : undefined;
}

function getEmail(payload: JWTPayload) {
  const directEmail = getStringClaim(payload, "email");

  if (directEmail) {
    return directEmail;
  }

  const namespacedEmail = Object.entries(payload).find(
    ([key, value]) => key.endsWith("/email") && typeof value === "string"
  );
  return typeof namespacedEmail?.[1] === "string" ? namespacedEmail[1] : undefined;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  // Dev mode bypass - check FIRST before Auth0 validation
  if (isDevModeEnabled()) {
    const devEmail = getDevModeUserEmail();
    logger.info("authentication_dev_mode", {
      devEmail,
      path: request.path,
      method: request.method,
    });
    request.auth = { email: devEmail };
    next();
    return;
  }

  const config = getAuthConfig();

  if (!config) {
    logger.warn("authentication_failed", { reason: "auth_not_configured" });
    response.status(401).json({ message: "Auth0 API auth is not configured" });
    return;
  }

  const authorization = request.header("Authorization");

  if (!authorization?.startsWith(bearerPrefix)) {
    logger.warn("authentication_failed", { reason: "missing_bearer_token" });
    response.status(401).json({ message: "Missing bearer token" });
    return;
  }

  const token = authorization.slice(bearerPrefix.length).trim();

  if (!token) {
    logger.warn("authentication_failed", { reason: "empty_bearer_token" });
    response.status(401).json({ message: "Missing bearer token" });
    return;
  }

  try {
    jwks ??= createRemoteJWKSet(config.jwksUrl);
    const { payload } = await jwtVerify(token, jwks, {
      audience: config.audience,
      issuer: config.issuer,
    });
    const email = getEmail(payload)?.trim().toLowerCase();

    if (!email) {
      logger.warn("authentication_failed", { reason: "missing_email_claim" });
      response.status(403).json({ message: "Access denied" });
      return;
    }

    // If allowlist is configured, check if user is permitted
    if (config.allowedEmails && !config.allowedEmails.has(email)) {
      logger.warn("authentication_failed", { reason: "email_not_in_allowlist", email });
      response.status(403).json({ message: "Access denied" });
      return;
    }

    request.auth = { email };
    next();
  } catch (error) {
    logger.error("authentication_failed", error, { reason: "jwt_verification_failed" });
    response.status(401).json({ message: "Invalid bearer token" });
    return;
  }
}
