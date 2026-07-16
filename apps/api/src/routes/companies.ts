import { type Request, Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { createTimer } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { companyInputSchema, companyResearchApplyInputSchema, companyResearchInputSchema } from "../lib/schemas.js";
import {
  serializeCompany,
  serializeCompanyDetail,
  serializeCompanySummary,
  serializeInteraction,
} from "../lib/serializers.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";
import { buildResearchNote, getCompanyResearchService } from "../services/companies/company-research-service.js";
import { getCompanyService } from "../services/companies/company-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const companiesRouter = Router();

function isPresent(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

// List companies - optimized for client-side filtering
companiesRouter.get(
  "/list",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const companies = await getCompanyService().list(ownerEmail);
    response.json(companies);
  })
);

// Get single company by slug
companiesRouter.get(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const slugOrId = request.params.slugOrId;

    // Removed expensive status sync from read path - queries ALL user interactions
    // Status sync should happen on write operations (create/update interaction), not reads

    const company = await getCompanyService().get(slugOrId, ownerEmail);

    if (!company) {
      response.status(404).json({ message: "Company not found" });
      return;
    }

    response.json(
      serializeCompanyDetail({
        ...company,
        compensation: company.opportunities.map((opp) => opp.compensation).filter(Boolean),
      })
    );
  })
);

// Create a new company
companiesRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const input = companyInputSchema.parse(request.body);

    const company = await getCompanyService().create(input, ownerEmail);

    response.status(201).json(serializeCompany(company));
  })
);

// Update a company
companiesRouter.patch(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const slugOrId = request.params.slugOrId;
    const input = companyInputSchema.partial().parse(request.body);

    const company = await getCompanyService().update(slugOrId, input, ownerEmail);

    if (!company) {
      response.status(404).json({ message: "Company not found" });
      return;
    }

    response.json(serializeCompany(company));
  })
);

// Delete a company (only if no opportunities exist)
companiesRouter.delete(
  "/:slugOrId",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const slugOrId = request.params.slugOrId;

    try {
      const deleted = await getCompanyService().delete(slugOrId, ownerEmail);
      if (!deleted) {
        response.status(404).json({ message: "Company not found" });
        return;
      }
      response.status(204).end();
    } catch (error) {
      if (error instanceof Error && error.message.includes("Cannot delete company with")) {
        response.status(400).json({ message: error.message });
      } else {
        throw error;
      }
    }
  })
);

// Enrich company from text (legacy endpoint - now updates Company entity)
companiesRouter.post(
  "/:slugOrId/enrich",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const slugOrId = request.params.slugOrId;
    const timer = createTimer("route", "company enrich", { slugOrId });
    const { text } = z.object({ text: z.string().min(20) }).parse(request.body);

    const enrichment = await getAiParserService().parseCompanyEnrichment(text);

    // Normalize employees count to remove "Approximately", "~", etc.
    const normalizeEmployees = (value: string | null | undefined): string | null => {
      if (!value) return null;
      const cleaned = value
        .replace(/^(approximately|around|about|~|roughly)\s*/i, "")
        .replace(/\s+(employees?|people|team members?)\s*$/i, "")
        .trim();
      return cleaned || null;
    };

    const employeesLabel = normalizeEmployees(enrichment.employees);
    const employeesRange = employeesLabel
      ? await prisma.companySizeOption.upsert({
          where: { label: employeesLabel },
          create: { label: employeesLabel },
          update: {},
        })
      : null;
    const companyStage = enrichment.stage
      ? await prisma.companyStageOption.upsert({
          where: { label: enrichment.stage },
          create: { label: enrichment.stage },
          update: {},
        })
      : null;
    const domains = await Promise.all(
      enrichment.domains.map((label: string) =>
        prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} })
      )
    );

    const updatedCompany = await getCompanyService().update(
      slugOrId,
      {
        name: enrichment.companyName ?? undefined,
        location: enrichment.location ?? undefined,
        funding: enrichment.investmentRounds
          ? [enrichment.funding, enrichment.investmentRounds].filter(Boolean).join(" · ")
          : (enrichment.funding ?? undefined),
        employeesRangeId: employeesRange?.id ?? undefined,
        companyStageId: companyStage?.id ?? undefined,
        description: enrichment.companyDescription ?? undefined,
        productDescription: enrichment.productDescription ?? undefined,
        customersTraction: enrichment.customersTraction ?? undefined,
        techStack: enrichment.techStack.length > 0 ? enrichment.techStack.join(", ") : undefined,
        backendFrontendSplit: enrichment.backendFrontendSplit ?? undefined,
        notes: enrichment.rawImportantNotes.length > 0 ? enrichment.rawImportantNotes.join("\n") : undefined, // Input schema uses 'notes', maps to 'companyNotes' in DB
        domainIds: domains.map((d) => d.id),
      },
      ownerEmail
    );

    if (!updatedCompany) {
      response.status(404).json({ message: "Company not found" });
      return;
    }

    timer.end({ companyId: updatedCompany.id });
    response.json({ enrichment, company: serializeCompany(updatedCompany) });
  })
);

// Research company
companiesRouter.post(
  "/:slugOrId/research",
  asyncHandler(async (request, response) => {
    const slugOrId = request.params.slugOrId;
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const timer = createTimer("route", "company research", { slugOrId });

    const company = await getCompanyService().get(slugOrId, ownerEmail);
    if (!company) {
      response.status(404).json({ message: "Company not found" });
      return;
    }

    const input = companyResearchInputSchema.parse({ ...request.body, companyName: company.name });
    const research = await getCompanyResearchService().research(input);

    await getCompanyService().markResearched(slugOrId, ownerEmail);

    timer.end({ confidence: research.confidence });
    response.json({ research });
  })
);

// Apply research to company
companiesRouter.post(
  "/:slugOrId/research/apply",
  asyncHandler(async (request, response) => {
    const ownerEmail = (request as AuthenticatedRequest).auth.email;
    const slugOrId = request.params.slugOrId;
    const timer = createTimer("route", "company research apply", { slugOrId });

    const { targetOpportunitySlug, research } = companyResearchApplyInputSchema.parse(request.body);

    const company = await getCompanyService().get(slugOrId, ownerEmail);
    if (!company) {
      response.status(404).json({ message: "Company not found" });
      return;
    }

    // Normalize employees count to remove "Approximately", "~", etc.
    const normalizeEmployees = (value: string | null | undefined): string | null => {
      if (!value) return null;
      const cleaned = value
        .replace(/^(approximately|around|about|~|roughly)\s*/i, "")
        .replace(/\s+(employees?|people|team members?)\s*$/i, "")
        .trim();
      return cleaned || null;
    };

    const employeesLabel = normalizeEmployees(research.employees);
    const employeesRange = employeesLabel
      ? await prisma.companySizeOption.upsert({
          where: { label: employeesLabel },
          create: { label: employeesLabel },
          update: {},
        })
      : null;
    const domains =
      research.domains.length > 0
        ? await Promise.all(
            research.domains.map((label: string) =>
              prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} })
            )
          )
        : [];

    // Update the Company entity
    await getCompanyService().update(
      slugOrId,
      {
        name: isPresent(research.companyName) ? research.companyName : company.name,
        searchName: isPresent(research.companySearchName) ? research.companySearchName : company.searchName,
        funding: isPresent(company.funding) ? company.funding : research.funding,
        totalRaised: isPresent(company.totalRaised) ? company.totalRaised : research.totalRaised,
        latestRound: isPresent(company.latestRound) ? company.latestRound : research.latestRound,
        employeesRangeId: company.employeesRangeId ?? employeesRange?.id ?? undefined,
        location: isPresent(company.location) ? company.location : research.location,
        linkedinUrl: isPresent(company.linkedinUrl) ? company.linkedinUrl : research.linkedinUrl,
        description: isPresent(company.description) ? company.description : research.companyDescription,
        productDescription: isPresent(company.productDescription)
          ? company.productDescription
          : research.productDescription,
        customersTraction: isPresent(company.customersTraction)
          ? company.customersTraction
          : research.customersTraction,
        domainIds:
          domains.length > 0
            ? [...new Set([...company.domains.map((d) => d.domainId), ...domains.map((d) => d.id)])]
            : undefined,
      },
      ownerEmail
    );

    // Create note on specific opportunity or first opportunity
    const targetOpportunity = targetOpportunitySlug
      ? company.opportunities.find((opp) => opp.slug === targetOpportunitySlug)
      : company.opportunities[0];

    if (targetOpportunity) {
      await prisma.note.create({
        data: {
          ownerEmail,
          jobOpportunityId: targetOpportunity.id,
          title: `Company research: ${research.companyName}`,
          category: "Company Research",
          content: buildResearchNote(research),
        },
      });
    } else {
      // Create company-level note if no opportunities
      await prisma.note.create({
        data: {
          ownerEmail,
          companyId: company.id,
          title: `Company research: ${research.companyName}`,
          category: "Company Research",
          content: buildResearchNote(research),
        },
      });
    }

    timer.end({ companyId: company.id });
    response.json({ research, company: serializeCompany(company) });
  })
);
