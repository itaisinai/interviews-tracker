/**
 * Health check routes
 * Provides endpoints for monitoring and readiness checks
 */

import { Router } from "express";

import { checkReadiness, getBasicHealth, getDeepHealth } from "../services/health/health-service.js";

export const healthRouter = Router();

/**
 * GET /health
 * Lightweight health check - always fast, no DB queries
 * Use for: Uptime monitoring (UptimeRobot, etc.)
 */
healthRouter.get("/", (_request, response) => {
  const health = getBasicHealth();
  response.status(200).json(health);
});

/**
 * GET /health/deep
 * Deep health check - verifies database connectivity
 * Use for: Infrastructure monitoring, alerting on database issues
 */
healthRouter.get("/deep", async (_request, response) => {
  const health = await getDeepHealth();

  if (health.ok) {
    response.status(200).json(health);
  } else {
    response.status(503).json(health);
  }
});

/**
 * GET /ready
 * Readiness check - for load balancers and orchestration
 * Returns 200 only if API is fully operational
 */
healthRouter.get("/ready", async (_request, response) => {
  const readiness = await checkReadiness();

  if (readiness.ready) {
    response.status(200).json(readiness);
  } else {
    response.status(503).json(readiness);
  }
});
