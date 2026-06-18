import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { personResearchInputSchema } from "../lib/schemas.js";
import { getPersonResearchService } from "../services/people/person-research-service.js";

export const peopleRouter = Router();

// Research a person
peopleRouter.post("/research", asyncHandler(async (request, response) => {
  const input = personResearchInputSchema.parse(request.body);
  const service = getPersonResearchService();
  const result = await service.researchPerson(input);

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
