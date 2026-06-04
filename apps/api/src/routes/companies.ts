import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { aiParserService } from "../services/ai-parser-service.js";

export const companiesRouter = Router();

const include = {
  employeesRange: true,
  companyStage: true,
  workModel: true,
  domains: { include: { domain: true } },
  interactions: { orderBy: { date: "asc" as const } },
  notesList: { orderBy: { createdAt: "desc" as const } },
  tasks: { orderBy: { dueDate: "asc" as const } },
  compensation: true
};

companiesRouter.get("/", asyncHandler(async (_request, response) => {
  const opportunities = await prisma.jobOpportunity.findMany({ include, orderBy: { updatedAt: "desc" } });
  const companies = new Map<string, typeof opportunities>();

  for (const opportunity of opportunities) {
    companies.set(opportunity.companyName, [...(companies.get(opportunity.companyName) ?? []), opportunity]);
  }

  response.json([...companies.entries()].map(([companyName, items]) => {
    const primary = items[0];
    const interactions = items.flatMap((item) => item.interactions);
    const domains = [...new Set(items.flatMap((item) => item.domains.map((domain) => domain.domain.label)))];

    return {
      companyName,
      rolesCount: items.length,
      activeProcesses: items.filter((item) => item.pipelineType === "ACTIVE_PROCESS").length,
      potentialOpportunities: items.filter((item) => item.pipelineType === "POTENTIAL").length,
      interactionsCount: interactions.length,
      nextInteraction: interactions.filter((item) => item.date >= new Date()).sort((a, b) => +a.date - +b.date)[0] ?? null,
      priority: items.some((item) => item.priority === "HIGH") ? "HIGH" : primary?.priority ?? "MEDIUM",
      status: primary?.status ?? "RESEARCH_LEAD",
      employees: primary?.employeesRange?.label ?? null,
      stage: primary?.companyStage?.label ?? null,
      domains,
      workModel: primary?.workModel?.label ?? null,
      location: primary?.location ?? null,
      funding: primary?.funding ?? null,
      updatedAt: primary?.updatedAt ?? null
    };
  }));
}));

companiesRouter.get("/:companyName", asyncHandler(async (request, response) => {
  const companyName = decodeURIComponent(request.params.companyName);
  const opportunities = await prisma.jobOpportunity.findMany({
    where: { companyName },
    include,
    orderBy: { updatedAt: "desc" }
  });

  response.json({
    companyName,
    opportunities,
    interactions: opportunities.flatMap((item) => item.interactions.map((interaction) => ({ ...interaction, jobOpportunity: item }))),
    notes: opportunities.flatMap((item) => item.notesList),
    tasks: opportunities.flatMap((item) => item.tasks),
    compensation: opportunities.map((item) => item.compensation).filter(Boolean)
  });
}));

companiesRouter.delete("/:companyName", asyncHandler(async (request, response) => {
  const companyName = decodeURIComponent(request.params.companyName);
  await prisma.jobOpportunity.deleteMany({ where: { companyName } });
  response.status(204).end();
}));

companiesRouter.post("/:companyName/enrich", asyncHandler(async (request, response) => {
  const companyName = decodeURIComponent(request.params.companyName);
  const { text } = z.object({ text: z.string().min(20) }).parse(request.body);
  const enrichment = await aiParserService.parseCompanyEnrichment(text);
  const targetName = enrichment.companyName ?? companyName;

  const employeesRange = enrichment.employees ? await prisma.companySizeOption.upsert({ where: { label: enrichment.employees }, create: { label: enrichment.employees }, update: {} }) : null;
  const companyStage = enrichment.stage ? await prisma.companyStageOption.upsert({ where: { label: enrichment.stage }, create: { label: enrichment.stage }, update: {} }) : null;
  const workModel = enrichment.workModel ? await prisma.workModelOption.upsert({ where: { label: enrichment.workModel }, create: { label: enrichment.workModel }, update: {} }) : null;
  const domains = await Promise.all(enrichment.domains.map((label) => prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} })));

  const opportunities = await prisma.jobOpportunity.findMany({ where: { companyName }, select: { id: true } });

  for (const opportunity of opportunities) {
    await prisma.jobOpportunity.update({
      where: { id: opportunity.id },
      data: {
        companyName: targetName,
        employeesRangeId: employeesRange?.id,
        companyStageId: companyStage?.id,
        workModelId: workModel?.id,
        location: enrichment.location,
        funding: enrichment.investmentRounds ? [enrichment.funding, enrichment.investmentRounds].filter(Boolean).join(" · ") : enrichment.funding,
        companyDescription: enrichment.companyDescription,
        productDescription: enrichment.productDescription,
        customersTraction: enrichment.customersTraction,
        techStack: enrichment.techStack.join(", "),
        backendFrontendSplit: enrichment.backendFrontendSplit,
        compensationNotes: enrichment.compensationNotes,
        notes: enrichment.rawImportantNotes.length > 0 ? enrichment.rawImportantNotes.join("\n") : undefined
      }
    });

    await prisma.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: opportunity.id } });
    if (domains.length > 0) {
      await prisma.jobOpportunityDomain.createMany({
        data: domains.map((domain) => ({ jobOpportunityId: opportunity.id, domainId: domain.id })),
        skipDuplicates: true
      });
    }
  }

  response.json({ enrichment, updatedOpportunities: opportunities.length });
}));
