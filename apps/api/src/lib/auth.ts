import type { NextFunction, Request, Response } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { logger } from "./logger.js";
import { isDevModeEnabled, getDevModeUserEmail } from "./dev-mode.js";

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
  return domain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function getAuthConfig() {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_AUDIENCE;
  const allowedEmail = process.env.ALLOWED_EMAIL?.trim().toLowerCase();

  if (!domain || !audience || !allowedEmail) {
    return undefined;
  }

  const normalizedDomain = normalizeDomain(domain);

  return {
    audience,
    allowedEmail,
    issuer: `https://${normalizedDomain}/`,
    jwksUrl: new URL(`https://${normalizedDomain}/.well-known/jwks.json`)
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

  const namespacedEmail = Object.entries(payload).find(([key, value]) => key.endsWith("/email") && typeof value === "string");
  return typeof namespacedEmail?.[1] === "string" ? namespacedEmail[1] : undefined;
}

export async function requireAuth(request: Request, response: Response, next: NextFunction) {
  // Dev mode bypass - check FIRST before Auth0 validation
  if (isDevModeEnabled()) {
    const devEmail = getDevModeUserEmail();
    logger.info("authentication_dev_mode", {
      devEmail,
      path: request.path,
      method: request.method
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
      issuer: config.issuer
    });
    const email = getEmail(payload)?.trim().toLowerCase();

    if (email !== config.allowedEmail) {
      logger.warn("authentication_failed", { reason: "email_not_allowed" });
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
