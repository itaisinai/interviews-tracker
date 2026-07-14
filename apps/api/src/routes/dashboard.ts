import { type Request, Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { serializeInteractions, serializeOpportunities } from "../lib/serializers.js";
import { normalizeOverdueScheduledInteractionsForRead } from "../repositories/interaction-read-normalizer.js";
import { syncOpportunityStatusRecord } from "../repositories/opportunity-repository.js";
import { startOfToday } from "../services/gmail/date-helpers.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const today = startOfToday();
    const overdueOpportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
    await Promise.all(overdueOpportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));
    const [opportunities, interactions] = await Promise.all([
      prisma.jobOpportunity.findMany({
        where: { ownerEmail },
        include: {
          company: true,
          interactions: true,
          domains: { include: { domain: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.interaction.findMany({
        where: {
          ownerEmail,
          date: { gte: today },
          status: { notIn: ["DONE", "REJECTED", "CANCELLED"] },
        },
        include: {
          jobOpportunity: {
            include: { company: true },
          },
        },
        orderBy: { date: "asc" },
        take: 8,
      }),
    ]);

    const advancedStatusOpportunities = opportunities.filter(
      (item) =>
        item.status === "PHONE_SCHEDULED" ||
        item.status === "PHONE_DONE" ||
        item.status === "TECHNICAL_SCHEDULED" ||
        item.status === "TECHNICAL_DONE" ||
        item.status === "HOME_ASSIGNMENT" ||
        item.status === "ASSIGNMENT_SUBMITTED" ||
        item.status === "FINAL_STAGE"
    );

    response.json({
      counts: {
        activeProcesses: opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").length,
        potential: opportunities.filter((item) => item.pipelineType === "POTENTIAL").length,
        upcomingInteractions: interactions.length,
        offers: opportunities.filter((item) => item.status === "OFFER").length,
        rejections: opportunities.filter((item) => item.status === "REJECTED").length,
        advancedStatus: advancedStatusOpportunities.length,
      },
      upcomingInteractions: serializeInteractions(interactions),
      activeProcesses: serializeOpportunities(
        opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").slice(0, 8)
      ),
      advancedStatusOpportunities: serializeOpportunities(advancedStatusOpportunities.slice(0, 8)),
      needingFollowUp: serializeOpportunities(
        opportunities
          .filter((item) => item.interactions.some((interaction) => interaction.status === "NEEDS_FOLLOW_UP"))
          .slice(0, 8)
      ),
    });
  })
);
