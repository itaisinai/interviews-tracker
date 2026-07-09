import type { Request } from "express";
import { Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { gmailConnectRequestSchema } from "../lib/schemas.js";
import {
  createGmailAuthUrl,
  disconnectGmail,
  getGmailStatus,
  listAllIgnoredGmailMessages,
  unignoreGmailMessage,
} from "../services/gmail/gmail-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const gmailRouter = Router();

gmailRouter.get(
  "/status",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "status", { email: request.auth?.email ?? "unknown" });
    const status = await getGmailStatus(request.auth?.email ?? "");
    timer.end({ connected: status.connected });
    response.json(status);
  })
);

gmailRouter.delete(
  "/connection",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "disconnect", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    await disconnectGmail(request.auth.email);
    timer.end();
    response.status(204).end();
  })
);

gmailRouter.post(
  "/connect",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "connect", { email: request.auth?.email ?? "unknown" });
    const { returnTo } = gmailConnectRequestSchema.parse(request.body);

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    const authUrl = createGmailAuthUrl(request.auth.email, returnTo);
    timer.end();
    response.json({ authUrl });
  })
);

gmailRouter.get(
  "/ignored-messages",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "list-ignored", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    const ignoredMessages = await listAllIgnoredGmailMessages({ auth0Email: request.auth.email });
    timer.end({ count: ignoredMessages.length });
    response.json({ ignoredMessages });
  })
);

gmailRouter.delete(
  "/ignored-messages/:messageId",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "unignore-global", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    await unignoreGmailMessage({
      auth0Email: request.auth.email,
      messageId: request.params.messageId,
    });

    timer.end();
    response.status(204).end();
  })
);
