import { Router } from "express";
import { endOfWeek, startOfToday } from "../services/date-helpers.js";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", asyncHandler(async (_request, response) => {
  const today = startOfToday();
  const weekEnd = endOfWeek(today);
  const [opportunities, interactions, tasks] = await Promise.all([
    prisma.jobOpportunity.findMany({ include: { interactions: true, domains: { include: { domain: true } } }, orderBy: { updatedAt: "desc" } }),
    prisma.interaction.findMany({ where: { date: { gte: today } }, include: { jobOpportunity: true }, orderBy: { date: "asc" }, take: 8 }),
    prisma.task.findMany({ where: { dueDate: { gte: today, lte: weekEnd }, status: { in: ["PENDING", "IN_PROGRESS"] } }, include: { jobOpportunity: true }, orderBy: { dueDate: "asc" } })
  ]);

  response.json({
    counts: {
      activeProcesses: opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").length,
      potential: opportunities.filter((item) => item.pipelineType === "POTENTIAL").length,
      upcomingInteractions: interactions.length,
      offers: opportunities.filter((item) => item.status === "OFFER").length,
      rejections: opportunities.filter((item) => item.status === "REJECTED").length,
      highPriority: opportunities.filter((item) => item.priority === "HIGH").length,
      tasksDueSoon: tasks.length
    },
    upcomingInteractions: interactions,
    activeProcesses: opportunities.filter((item) => item.pipelineType === "ACTIVE_PROCESS").slice(0, 8),
    highPriorityPotential: opportunities.filter((item) => item.pipelineType === "POTENTIAL" && item.priority === "HIGH").slice(0, 8),
    needingFollowUp: opportunities.filter((item) => item.interactions.some((interaction) => interaction.status === "NEEDS_FOLLOW_UP")).slice(0, 8),
    tasksDueThisWeek: tasks
  });
}));
