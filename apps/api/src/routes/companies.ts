import { Router, type Request } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";
import { companyResearchApplyInputSchema, companyResearchInputSchema } from "../lib/schemas.js";
import { buildResearchNote, getCompanyResearchService } from "../services/companies/company-research-service.js";
import { normalizeOverdueScheduledInteractionsForRead } from "../repositories/interaction-read-normalizer.js";
import { syncOpportunityStatusRecord } from "../repositories/opportunity-repository.js";
import { serializeCompanySummary, serializeCompanyDetail, serializeOpportunities } from "../lib/serializers.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const companiesRouter = Router();

function isPresent(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

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

companiesRouter.get("/", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const overdueOpportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(overdueOpportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));
  const opportunities = await prisma.jobOpportunity.findMany({ where: { ownerEmail }, include, orderBy: { updatedAt: "desc" } });
  const companies = new Map<string, typeof opportunities>();

  for (const opportunity of opportunities) {
    companies.set(opportunity.companyName, [...(companies.get(opportunity.companyName) ?? []), opportunity]);
  }

  const companySummaries = [...companies.entries()].map(([companyName, items]) => {
    const primary = items[0];
    const interactions = items.flatMap((item) => item.interactions);
    const domains = [...new Set(items.flatMap((item) => item.domains.map((domain: { domain: { label: string } }) => domain.domain.label)))];

    return serializeCompanySummary({
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
    });
  });
  response.json(companySummaries);
}));

companiesRouter.get("/:companyName", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const companyName = decodeURIComponent(request.params.companyName);
  const overdueOpportunityIds = await normalizeOverdueScheduledInteractionsForRead(ownerEmail);
  await Promise.all(overdueOpportunityIds.map((id) => syncOpportunityStatusRecord(id, ownerEmail)));
  const opportunities = await prisma.jobOpportunity.findMany({
    where: { ownerEmail, companyName },
    include,
    orderBy: { updatedAt: "desc" }
  });

  response.json(serializeCompanyDetail({
    companyName,
    opportunities: serializeOpportunities(opportunities),
    interactions: opportunities.flatMap((item) => item.interactions.map((interaction) => ({ ...interaction, jobOpportunity: item }))),
    notes: opportunities.flatMap((item) => item.notesList),
    tasks: opportunities.flatMap((item) => item.tasks),
    compensation: opportunities.map((item) => item.compensation).filter(Boolean)
  }));
}));

companiesRouter.delete("/:companyName", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const companyName = decodeURIComponent(request.params.companyName);
  await prisma.jobOpportunity.deleteMany({ where: { ownerEmail, companyName } });
  response.status(204).end();
}));

companiesRouter.post("/:companyName/enrich", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const companyName = decodeURIComponent(request.params.companyName);
  const timer = createTimer("route", "company enrich", { company: companyName });
  const { text } = z.object({ text: z.string().min(20) }).parse(request.body);
  const enrichment = await getAiParserService().parseCompanyEnrichment(text);
  const targetName = enrichment.companyName ?? companyName;

  const employeesRange = enrichment.employees ? await prisma.companySizeOption.upsert({ where: { label: enrichment.employees }, create: { label: enrichment.employees }, update: {} }) : null;
  const companyStage = enrichment.stage ? await prisma.companyStageOption.upsert({ where: { label: enrichment.stage }, create: { label: enrichment.stage }, update: {} }) : null;
  const workModel = enrichment.workModel ? await prisma.workModelOption.upsert({ where: { label: enrichment.workModel }, create: { label: enrichment.workModel }, update: {} }) : null;
  const domains = await Promise.all(enrichment.domains.map((label: string) => prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} })));

  const opportunities = await prisma.jobOpportunity.findMany({ where: { ownerEmail, companyName }, select: { id: true } });

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

    await prisma.jobOpportunityDomain.deleteMany({ where: { jobOpportunityId: opportunity.id, ownerEmail } });
    if (domains.length > 0) {
      await prisma.jobOpportunityDomain.createMany({
        data: domains.map((domain) => ({ ownerEmail, jobOpportunityId: opportunity.id, domainId: domain.id })),
        skipDuplicates: true
      });
    }
  }

  timer.end({ updatedOpportunities: opportunities.length });
  response.json({ enrichment, updatedOpportunities: opportunities.length });
}));

companiesRouter.post("/:companyName/research", asyncHandler(async (request, response) => {
  const companyName = decodeURIComponent(request.params.companyName);
  const timer = createTimer("route", "company research", { company: companyName });
  const input = companyResearchInputSchema.parse({ ...request.body, companyName });
  const research = await getCompanyResearchService().research(input);

  timer.end({ confidence: research.confidence });
  response.json({ research });
}));

companiesRouter.post("/:companyName/research/apply", asyncHandler(async (request, response) => {
  const ownerEmail = (request as AuthenticatedRequest).auth.email;
  const companyName = decodeURIComponent(request.params.companyName);
  const timer = createTimer("route", "company research apply", { company: companyName });
  const { targetOpportunityId, research } = companyResearchApplyInputSchema.parse(request.body);
  const targetOpportunities = await prisma.jobOpportunity.findMany({
    where: targetOpportunityId ? { id: targetOpportunityId, ownerEmail } : { ownerEmail, companyName },
    select: {
      id: true,
      companyName: true,
      companySearchName: true,
      funding: true,
      employeesRangeId: true,
      location: true,
      linkedinUrl: true,
      companyDescription: true,
      productDescription: true,
      customersTraction: true
    }
  });

  if (targetOpportunities.length === 0) {
    response.status(404).json({ message: "Company opportunity not found" });
    return;
  }

  const employeesLabel = research.employees?.trim();
  const employeesRange = employeesLabel ? await prisma.companySizeOption.upsert({
    where: { label: employeesLabel },
    create: { label: employeesLabel },
    update: {}
  }) : null;
  const domains = research.domains.length > 0
    ? await Promise.all(research.domains.map((label: string) => prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} })))
    : [];

  for (const opportunity of targetOpportunities) {
    await prisma.jobOpportunity.update({
      where: { id: opportunity.id },
      data: {
        companyName: isPresent(research.companyName) ? research.companyName : opportunity.companyName,
        funding: isPresent(opportunity.funding) ? opportunity.funding : research.funding,
        companySearchName: isPresent(research.companySearchName) ? research.companySearchName : opportunity.companySearchName,
        employeesRangeId: opportunity.employeesRangeId ?? employeesRange?.id ?? null,
        location: isPresent(opportunity.location) ? opportunity.location : research.location,
        linkedinUrl: isPresent(opportunity.linkedinUrl) ? opportunity.linkedinUrl : research.linkedinUrl,
        companyDescription: isPresent(opportunity.companyDescription) ? opportunity.companyDescription : research.companyDescription,
        productDescription: isPresent(opportunity.productDescription) ? opportunity.productDescription : research.productDescription,
        customersTraction: isPresent(opportunity.customersTraction) ? opportunity.customersTraction : research.customersTraction
      }
    });

    if (domains.length > 0) {
      await prisma.jobOpportunityDomain.createMany({
        data: domains.map((domain) => ({ ownerEmail, jobOpportunityId: opportunity.id, domainId: domain.id })),
        skipDuplicates: true
      });
    }
  }

  const noteTarget = targetOpportunities[0];
  await prisma.note.create({
    data: {
      ownerEmail,
      jobOpportunityId: noteTarget.id,
      title: `Company research: ${research.companyName}`,
      category: "Company Research",
      content: buildResearchNote(research)
    }
  });

  timer.end({ updatedOpportunities: targetOpportunities.length });
  response.json({ research, updatedOpportunities: targetOpportunities.length });
}));
