import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export const optionsRouter = Router();

const labelSchema = z.object({ label: z.string().min(1) });

optionsRouter.get("/", asyncHandler(async (_request, response) => {
  const [companySizes, companyStages, domains, workModels, interactionTypes, interviewStages] = await Promise.all([
    prisma.companySizeOption.findMany({ orderBy: { label: "asc" } }),
    prisma.companyStageOption.findMany({ orderBy: { label: "asc" } }),
    prisma.domainOption.findMany({ orderBy: { label: "asc" } }),
    prisma.workModelOption.findMany({ orderBy: { label: "asc" } }),
    prisma.interactionTypeOption.findMany({ orderBy: { label: "asc" } }),
    prisma.interviewStageOption.findMany({ orderBy: { label: "asc" } })
  ]);
  response.json({ companySizes, companyStages, domains, workModels, interactionTypes, interviewStages });
}));

optionsRouter.post("/domain", asyncHandler(async (request, response) => {
  const { label } = labelSchema.parse(request.body);
  response.status(201).json(await prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} }));
}));

optionsRouter.post("/:kind", asyncHandler(async (request, response) => {
  const { label } = labelSchema.parse(request.body);
  const kind = request.params.kind;

  if (kind === "company-size") {
    response.status(201).json(await prisma.companySizeOption.upsert({ where: { label }, create: { label }, update: {} }));
    return;
  }
  if (kind === "company-stage") {
    response.status(201).json(await prisma.companyStageOption.upsert({ where: { label }, create: { label }, update: {} }));
    return;
  }
  if (kind === "work-model") {
    response.status(201).json(await prisma.workModelOption.upsert({ where: { label }, create: { label }, update: {} }));
    return;
  }
  if (kind === "interaction-type") {
    response.status(201).json(await prisma.interactionTypeOption.upsert({ where: { label }, create: { label }, update: {} }));
    return;
  }
  if (kind === "interview-stage") {
    response.status(201).json(await prisma.interviewStageOption.upsert({ where: { label }, create: { label }, update: {} }));
    return;
  }

  response.status(404).json({ message: "Unknown option list" });
}));

optionsRouter.delete("/:kind/:id", asyncHandler(async (request, response) => {
  const { kind, id } = request.params;

  if (kind === "domain") {
    await prisma.jobOpportunityDomain.deleteMany({ where: { domainId: id } });
    await prisma.domainOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }
  if (kind === "company-size") {
    await prisma.jobOpportunity.updateMany({ where: { employeesRangeId: id }, data: { employeesRangeId: null } });
    await prisma.companySizeOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }
  if (kind === "company-stage") {
    await prisma.jobOpportunity.updateMany({ where: { companyStageId: id }, data: { companyStageId: null } });
    await prisma.companyStageOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }
  if (kind === "work-model") {
    await prisma.jobOpportunity.updateMany({ where: { workModelId: id }, data: { workModelId: null } });
    await prisma.workModelOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }
  if (kind === "interaction-type") {
    await prisma.interactionTypeOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }
  if (kind === "interview-stage") {
    await prisma.interviewStageOption.delete({ where: { id } });
    response.status(204).end();
    return;
  }

  response.status(404).json({ message: "Unknown option list" });
}));
