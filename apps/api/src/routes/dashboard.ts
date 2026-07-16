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

    // Optimized: Remove expensive status sync from dashboard load
    // Status sync adds 1-3 seconds with cloud databases (queries ALL interactions + N opportunity updates)
    // Dashboard data doesn't need real-time status - it's refreshed on page load anyway

    // Single parallel query - no sequential N+1
    const [opportunities, upcomingInteractions] = await Promise.all([
      // Lightweight opportunity query - only fields needed for counts
      prisma.jobOpportunity.findMany({
        where: { ownerEmail },
        select: {
          id: true,
          slug: true,
          roleTitle: true,
          status: true,
          pipelineType: true,
          updatedAt: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          interactions: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      // Upcoming interactions
      prisma.interaction.findMany({
        where: {
          ownerEmail,
          date: { gte: today },
          status: { notIn: ["DONE", "REJECTED", "CANCELLED"] },
        },
        include: {
          jobOpportunity: {
            select: {
              slug: true,
              roleTitle: true,
              pipelineType: true,
              status: true,
              updatedAt: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { date: "asc" },
        take: 8,
      }),
    ]);

    // Memory filtering - instant with <100 opportunities
    const advancedStatuses = [
      "PHONE_SCHEDULED",
      "PHONE_DONE",
      "TECHNICAL_SCHEDULED",
      "TECHNICAL_DONE",
      "HOME_ASSIGNMENT",
      "ASSIGNMENT_SUBMITTED",
      "FINAL_STAGE",
    ];
    const advancedStatusOpportunities = opportunities.filter((item) => advancedStatuses.includes(item.status));
    const activeProcesses = opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS");
    const needingFollowUp = opportunities.filter((item) =>
      item.interactions.some((interaction) => interaction.status === "NEEDS_FOLLOW_UP")
    );

    response.json({
      counts: {
        activeProcesses: activeProcesses.length,
        potential: opportunities.filter((item) => item.pipelineType === "POTENTIAL").length,
        upcomingInteractions: upcomingInteractions.length,
        offers: opportunities.filter((item) => item.status === "OFFER").length,
        rejections: opportunities.filter((item) => item.status === "REJECTED").length,
        advancedStatus: advancedStatusOpportunities.length,
      },
      upcomingInteractions: serializeInteractions(upcomingInteractions as any),
      activeProcesses: serializeOpportunities(activeProcesses.slice(0, 8) as any),
      advancedStatusOpportunities: serializeOpportunities(advancedStatusOpportunities.slice(0, 8) as any),
      needingFollowUp: serializeOpportunities(needingFollowUp.slice(0, 8) as any),
    });
  })
);
