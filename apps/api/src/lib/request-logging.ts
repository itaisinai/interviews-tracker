import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

import { logger } from "./logger.js";

function requestIdFromHeaders(request: Request) {
  const requestId = request.header("x-request-id") ?? request.header("x-correlation-id");
  return requestId?.trim() || undefined;
}

function routeWithoutQuery(request: Request) {
  return request.originalUrl.split("?")[0] || request.path;
}

export function apiRequestLogger(request: Request, response: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();
  const requestId = requestIdFromHeaders(request) ?? randomUUID();

  response.setHeader("x-request-id", requestId);

  response.on("finish", () => {
    const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);

    logger.info(
      "api_request_completed",
      {
        method: request.method,
        route: routeWithoutQuery(request),
        statusCode: response.statusCode,
        durationMs,
        requestId,
      },
      { requestId, route: routeWithoutQuery(request) }
    );
  });

  next();
}
