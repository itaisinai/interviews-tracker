import { type Request, Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

type AuthenticatedRequest = Request & { auth: { email: string } };
export const notificationsRouter = Router();

notificationsRouter.get(
  "/unread-count",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    response.json({ count: await prisma.notification.count({ where: { ownerEmail, readAt: null } }) });
  })
);

notificationsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    response.json(
      await prisma.notification.findMany({ where: { ownerEmail }, orderBy: { createdAt: "desc" }, take: 100 })
    );
  })
);

notificationsRouter.patch(
  "/read-all",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    await prisma.notification.updateMany({ where: { ownerEmail, readAt: null }, data: { readAt: new Date() } });
    response.status(204).end();
  })
);

notificationsRouter.patch(
  "/:id/read",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    await prisma.notification.updateMany({
      where: { id: request.params.id, ownerEmail },
      data: { readAt: new Date() },
    });
    response.status(204).end();
  })
);
