import { Router, type Request } from "express";
import { startOfToday } from "../services/gmail/date-helpers.js";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { normalizeOverdueScheduledInteractionsForRead } from "../repositories/interaction-read-normalizer.js";
import { syncOpportunityStatusRecord } from "../repositories/opportunity-repository.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const dashboardRouter = Router();

dashboardRouter.get("/", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const today = startOfToday();
  const overdueOpportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(overdueOpportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));
  const [opportunities, interactions] = await Promise.all([
    prisma.jobOpportunity.findMany({ where: { ownerEmail }, include: { interactions: true, domains: { include: { domain: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.interaction.findMany({ where: { ownerEmail, date: { gte: today } }, include: { jobOpportunity: true }, orderBy: { date: "asc" }, take: 8 })
  ]);

  response.json({
    counts: {
      activeProcesses: opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").length,
      potential: opportunities.filter((item) => item.pipelineType === "POTENTIAL").length,
      upcomingInteractions: interactions.length,
      offers: opportunities.filter((item) => item.status === "OFFER").length,
      rejections: opportunities.filter((item) => item.status === "REJECTED").length,
      highPriority: opportunities.filter((item) => item.priority === "HIGH").length
    },
    upcomingInteractions: interactions,
    activeProcesses: opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").slice(0, 8),
    highPriorityPotential: opportunities.filter((item) => item.pipelineType === "POTENTIAL" && item.priority === "HIGH").slice(0, 8),
    needingFollowUp: opportunities.filter((item) => item.interactions.some((interaction) => interaction.status === "NEEDS_FOLLOW_UP")).slice(0, 8)
  });
}));
