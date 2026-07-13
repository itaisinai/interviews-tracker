import type { Request } from "express";
import { Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { gmailConnectRequestSchema } from "../lib/schemas.js";
import {
  createGmailAuthUrl,
  disconnectGmail,
  findGmailOpportunityCandidates,
  getGmailStatus,
  listAllIgnoredGmailMessages,
  parseGmailEmailToOpportunity,
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

gmailRouter.post(
  "/ignored-messages/:messageId",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "ignore-global", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    // Create a message state with IGNORED status (not tied to any opportunity)
    await prisma.gmailMessageState.upsert({
      where: {
        auth0Email_messageId: {
          auth0Email: request.auth.email,
          messageId: request.params.messageId,
        },
      },
      update: {
        status: "IGNORED",
      },
      create: {
        auth0Email: request.auth.email,
        messageId: request.params.messageId,
        status: "IGNORED",
        jobOpportunityId: null,
      },
    });

    timer.end();
    response.status(204).end();
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

gmailRouter.get(
  "/opportunity-candidates",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "find opportunity candidates", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    const maxResults = request.query.maxResults ? Number(request.query.maxResults) : undefined;
    const includeSupressed = request.query.includeSupressed === "true";
    const result = await findGmailOpportunityCandidates({
      auth0Email: request.auth.email,
      pageToken: typeof request.query.pageToken === "string" ? request.query.pageToken : null,
      maxResults,
      includeSupressed,
    });
    timer.end({ count: result.candidates.length });
    response.json(result);
  })
);

gmailRouter.post(
  "/opportunity-candidates/parse",
  asyncHandler(async (request, response) => {
    const timer = createTimer("gmail", "parse opportunity candidate", { email: request.auth?.email ?? "unknown" });

    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    const messageId = String(request.body?.messageId ?? "");
    if (!messageId) {
      response.status(400).json({ message: "messageId is required." });
      return;
    }

    const result = await parseGmailEmailToOpportunity({ auth0Email: request.auth.email, messageId });
    timer.end({ messageId });
    response.json(result);
  })
);

gmailRouter.delete(
  "/message-state/:messageId",
  asyncHandler(async (request, response) => {
    if (!request.auth?.email) {
      response.status(401).json({ message: "Missing authenticated email." });
      return;
    }

    const messageId = String(request.params.messageId ?? "");
    if (!messageId) {
      response.status(400).json({ message: "messageId is required." });
      return;
    }

    // Delete the message state to "restore" it (it will show up in searches again)
    await prisma.gmailMessageState.deleteMany({
      where: {
        auth0Email: request.auth.email,
        messageId,
      },
    });

    response.json({ success: true });
  })
);
