import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { personResearchInputSchema } from "../lib/schemas.js";
import { getPersonResearchService } from "../services/people/person-research-service.js";

export const peopleRouter = Router();

// Research a person
peopleRouter.post("/research", asyncHandler(async (request, response) => {
  const input = personResearchInputSchema.parse(request.body);
  console.log('[Research request]', JSON.stringify(input));
  const service = getPersonResearchService();
  const result = await service.researchPerson(input);

  if (!result) {
    response.status(404).json({
      code: "PERSON_RESEARCH_NOT_FOUND",
      message: input.companyName
        ? `No matching LinkedIn profile was found for ${input.name} at ${input.companyName}. Try adding the person's LinkedIn URL or checking the company name.`
        : `No LinkedIn profile was found for ${input.name}. Try adding the person's LinkedIn URL.`
    });
    return;
  }

  response.json(result);
}));

// Save person research
peopleRouter.post("/:personId/research", asyncHandler(async (request, response) => {
  const { personId } = request.params;
  const { research } = request.body;

  // Update or create person research
  const saved = await prisma.personResearch.upsert({
    where: { personId },
    update: {
      about: research.about || null,
      experience: research.experience || null,
      education: research.education || null,
      skills: research.skills || null,
      sources: research.sources || null
    },
    create: {
      personId,
      about: research.about || null,
      experience: research.experience || null,
      education: research.education || null,
      skills: research.skills || null,
      sources: research.sources || null
    },
    include: {
      person: true
    }
  });

  response.json(saved);
}));

// Get person with research
peopleRouter.get("/:personId", asyncHandler(async (request, response) => {
  const { personId } = request.params;

  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { research: true }
  });

  if (!person) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  response.json(person);
}));

// Create or find person
peopleRouter.post("/", asyncHandler(async (request, response) => {
  const { name, email, linkedinUrl, title, company, avatarUrl, jobOpportunityId } = request.body;

  // If linking to an opportunity, validate company match and check for duplicates
  if (jobOpportunityId) {
    const opportunity = await prisma.jobOpportunity.findUnique({
      where: { id: jobOpportunityId },
      select: { companyName: true }
    });

    if (!opportunity) {
      response.status(404).json({ error: "Opportunity not found" });
      return;
    }

    // Check if a person with the same name already exists for this opportunity
    const existingPerson = await prisma.person.findFirst({
      where: {
        name,
        jobOpportunityId
      }
    });

    if (existingPerson) {
      response.status(409).json({
        error: "Duplicate contact",
        message: `A contact named "${name}" already exists for this opportunity`,
        existingPersonId: existingPerson.id
      });
      return;
    }

    // Validate that the person's company matches the opportunity's company
    if (company && company !== opportunity.companyName) {
      // Extract company name from markdown link if present: [Company Name](url)
      const companyMatch = company.match(/^\[([^\]]+)\]/);
      const extractedCompany = companyMatch ? companyMatch[1] : company;

      // Normalize both company names for comparison (lowercase, remove special chars)
      const normalizeCompany = (name: string) =>
        name.toLowerCase().replace(/[^a-z0-9]/g, '');

      const normalizedExpected = normalizeCompany(opportunity.companyName);
      const normalizedActual = normalizeCompany(extractedCompany);

      // Check if the actual company contains the expected company or vice versa
      const isMatch = normalizedActual.includes(normalizedExpected) ||
                     normalizedExpected.includes(normalizedActual);

      if (!isMatch) {
        response.status(400).json({
          error: "Company mismatch",
          message: `Person's current company "${extractedCompany}" doesn't match opportunity company "${opportunity.companyName}". This person may not work at this company.`,
          personCompany: extractedCompany,
          opportunityCompany: opportunity.companyName
        });
        return;
      }
    }
  }

  // Try to find existing person by email or linkedinUrl
  let person = null;

  if (email) {
    person = await prisma.person.findUnique({ where: { email }, include: { research: true } });
  }

  if (!person && linkedinUrl) {
    person = await prisma.person.findUnique({ where: { linkedinUrl }, include: { research: true } });
  }

  if (!person) {
    // Create new person
    person = await prisma.person.create({
      data: {
        name,
        email: email || null,
        linkedinUrl: linkedinUrl || null,
        title: title || null,
        company: company || null,
        avatarUrl: avatarUrl || null,
        jobOpportunityId: jobOpportunityId || null
      },
      include: { research: true }
    });
  } else if (jobOpportunityId && !person.jobOpportunityId) {
    // Update existing person with jobOpportunityId if not set
    person = await prisma.person.update({
      where: { id: person.id },
      data: { jobOpportunityId },
      include: { research: true }
    });
  }

  response.json(person);
}));

// Search people
peopleRouter.get("/", asyncHandler(async (request, response) => {
  const { q } = request.query;

  const people = await prisma.person.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q as string, mode: "insensitive" } },
            { email: { contains: q as string, mode: "insensitive" } },
            { company: { contains: q as string, mode: "insensitive" } }
          ]
        }
      : undefined,
    include: { research: true },
    orderBy: { updatedAt: "desc" },
    take: 50
  });

  response.json(people);
}));
