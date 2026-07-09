import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

export function timingSafeEqualString(actual: string | undefined, expected: string | undefined) {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export function verifySharedSecretHeader(
  request: Request,
  response: Response,
  input: { headerName: string; expectedSecret?: string; missingConfigMessage: string }
) {
  if (!input.expectedSecret) {
    response.status(503).json({ message: input.missingConfigMessage });
    return false;
  }

  if (!timingSafeEqualString(request.header(input.headerName), input.expectedSecret)) {
    response.status(401).json({ message: "Invalid webhook secret" });
    return false;
  }

  return true;
}
