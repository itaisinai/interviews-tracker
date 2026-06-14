import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.js";
import { GmailReconnectRequiredError } from "../services/gmail/gmail-service.js";

export function asyncHandler(handler: (request: Request, response: Response, next: NextFunction) => Promise<unknown>) {
  return (request: Request, response: Response, next: NextFunction) => {
    handler(request, response, next).catch(next);
  };
}

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return response.status(400).json({ message: "Validation failed", issues: error.issues });
  }

  if (error instanceof GmailReconnectRequiredError) {
    return response.status(error.statusCode).json({ code: error.code, message: error.message });
  }

  if (error instanceof Error) {
    logger.error("internal_exception", error, {
      method: request.method,
      route: request.originalUrl.split("?")[0] || request.path,
      statusCode: 500
    });
    return response.status(500).json({ message: error.message });
  }

  logger.error("internal_exception", error, {
    method: request.method,
    route: request.originalUrl.split("?")[0] || request.path,
    statusCode: 500
  });
  return response.status(500).json({ message: "Unexpected server error" });
}
