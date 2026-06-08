import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { gmailConnectRequestSchema } from "../lib/schemas.js";
import { createGmailAuthUrl, getGmailStatus } from "../services/gmail/gmail-service.js";

export const gmailRouter = Router();

gmailRouter.get("/status", asyncHandler(async (request, response) => {
  const timer = createTimer("gmail", "status", { email: request.auth?.email ?? "unknown" });
  const status = await getGmailStatus(request.auth?.email ?? "");
  timer.end({ connected: status.connected });
  response.json(status);
}));

gmailRouter.post("/connect", asyncHandler(async (request, response) => {
  const timer = createTimer("gmail", "connect", { email: request.auth?.email ?? "unknown" });
  const { returnTo } = gmailConnectRequestSchema.parse(request.body);

  if (!request.auth?.email) {
    response.status(401).json({ message: "Missing authenticated email." });
    return;
  }

  const authUrl = createGmailAuthUrl(request.auth.email, returnTo);
  timer.end();
  response.json({ authUrl });
}));
