import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { personResearchInputSchema } from "../lib/schemas.js";
import { getPersonResearchService } from "../services/people/person-research-service.js";
import { parseCurrentJobDescription, applyParsedJobToTimeline } from "../services/people/parse-current-job-service.js";
import { createPersonWithSlug, resolvePersonId } from "../repositories/person-repository.js";
import type { AuthenticatedRequest } from "../lib/http.js";
import { resolveOpportunitySlug } from "../lib/slug-resolver.js";
import { serializePerson, serializePeople } from "../lib/serializers.js";

export const peopleRouter = Router();

// Log all requests to people routes
peopleRouter.use((req, res, next) => {
  console.log('[PEOPLE ROUTER]', req.method, req.path);
  next();
});

// Research a person
peopleRouter.post("/research", asyncHandler(async (request, response) => {
  const input = personResearchInputSchema.parse(request.body);
  const { opportunityId } = request.body; // Optional: for filtering wrong candidates

  console.log('[Research request]', JSON.stringify(input), 'opportunityId:', opportunityId);
  const service = getPersonResearchService();
  const result = await service.researchPerson(input, opportunityId);

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

// Parse current job description
peopleRouter.post("/:personId/parse-current-job", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: slugOrId } = request.params;
  const { jobDescriptionText } = request.body;

  if (!jobDescriptionText || typeof jobDescriptionText !== "string") {
    response.status(400).json({ error: "jobDescriptionText is required" });
    return;
  }

  // Resolve slug or ID to internal ID
  const personId = await resolvePersonId(slugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  // Get person with research
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { research: true }
  });

  if (!person) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  if (!person.research?.experience) {
    response.status(400).json({ error: "Person has no existing experience data to update" });
    return;
  }

  const currentExperience = person.research.experience as Array<{
    company: string;
    companyUrl?: string;
    totalDuration?: string;
    positions: Array<{
      title: string;
      dates?: string;
      duration?: string;
      description?: string;
    }>;
  }>;

  console.log('[PARSE CURRENT JOB] Person research experience:', JSON.stringify(currentExperience, null, 2));

  // Parse the job description
  const parsedJob = await parseCurrentJobDescription(jobDescriptionText, currentExperience);

  // Apply to timeline for preview
  const updatedTimeline = applyParsedJobToTimeline(parsedJob, currentExperience);

  response.json({
    parsedJob,
    updatedTimeline,
    currentTimeline: currentExperience
  });
}));

// Apply parsed job update to person's research
peopleRouter.post("/:personId/apply-job-update", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: slugOrId } = request.params;
  const { updatedTimeline } = request.body;

  if (!updatedTimeline || !Array.isArray(updatedTimeline)) {
    response.status(400).json({ error: "updatedTimeline is required" });
    return;
  }

  // Resolve slug or ID to internal ID
  const personId = await resolvePersonId(slugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  // Update person research with new timeline
  const updated = await prisma.personResearch.update({
    where: { personId },
    data: {
      experience: updatedTimeline
    },
    include: {
      person: true
    }
  });

  // Also update person's current company and title from the new timeline
  const currentJob = updatedTimeline[0];
  if (currentJob) {
    await prisma.person.update({
      where: { id: personId },
      data: {
        company: currentJob.company,
        title: currentJob.positions[0]?.title || null
      }
    });
  }

  response.json(updated);
}));

// Save person research
peopleRouter.post("/:personId/research", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: slugOrId } = request.params;
  const { research } = request.body;

  // Resolve slug or ID to internal ID
  const personId = await resolvePersonId(slugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

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

// Update person
peopleRouter.put("/:personId", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: slugOrId } = request.params;
  const { name, email, linkedinUrl, title, company, avatarUrl } = request.body;

  console.log('[UPDATE PERSON] Updating person:', slugOrId);

  // Resolve slug or ID to internal ID
  const personId = await resolvePersonId(slugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  const person = await prisma.person.update({
    where: { id: personId },
    data: {
      name: name || undefined,
      email: email || undefined,
      linkedinUrl: linkedinUrl || undefined,
      title: title || undefined,
      company: company || undefined,
      avatarUrl: avatarUrl || undefined
    },
    include: { research: true }
  });

  console.log('[UPDATE PERSON] Successfully updated');
  response.json(serializePerson(person));
}));

// Delete person (must come before GET /:personId)
peopleRouter.delete("/:personId", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: slugOrId } = request.params;
  console.log('[DELETE PERSON] Deleting person:', slugOrId);

  // Resolve slug or ID to internal ID
  const personId = await resolvePersonId(slugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  // Delete research first (if exists)
  await prisma.personResearch.deleteMany({
    where: { personId }
  });

  // Delete person
  await prisma.person.delete({
    where: { id: personId }
  });

  console.log('[DELETE PERSON] Successfully deleted');
  response.json({ success: true });
}));

// Get person with research
peopleRouter.get("/:personId", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId } = request.params;

  // Try finding by ID first (for backward compatibility), then by slug
  let person = await prisma.person.findUnique({
    where: { id: personId },
    include: { research: true }
  });

  // If not found by ID, try slug
  if (!person) {
    person = await prisma.person.findUnique({
      where: {
        ownerEmail_slug: {
          ownerEmail: request.auth.email,
          slug: personId
        }
      },
      include: { research: true }
    });
  }

  if (!person) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  response.json(serializePerson(person));
}));

// Create or find person
peopleRouter.post("/", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { name, email, linkedinUrl, title, company, avatarUrl, opportunitySlug, jobOpportunityId: providedId } = request.body;

  // Resolve slug to ID if provided (prefer slug over ID)
  const jobOpportunityId = opportunitySlug
    ? await resolveOpportunitySlug(opportunitySlug, request.auth.email)
    : providedId;

  // Removed: No longer checking for duplicate names per opportunity
  // Multiple people can have the same name in one opportunity
  // Uniqueness is enforced by email and linkedinUrl instead

  // Try to find existing person by email or linkedinUrl
  let person = null;

  if (email) {
    person = await prisma.person.findUnique({ where: { email }, include: { research: true } });
  }

  if (!person && linkedinUrl) {
    person = await prisma.person.findUnique({ where: { linkedinUrl }, include: { research: true } });
  }

  if (!person) {
    // Create new person with slug
    person = await createPersonWithSlug({
      name,
      ownerEmail: (request as AuthenticatedRequest).auth.email,
      email: email || null,
      linkedinUrl: linkedinUrl || null,
      title: title || null,
      company: company || null,
      avatarUrl: avatarUrl || null,
      jobOpportunityId: jobOpportunityId || null
    });
  } else if (jobOpportunityId && !person.jobOpportunityId) {
    // Update existing person with jobOpportunityId if not set
    person = await prisma.person.update({
      where: { id: person.id },
      data: { jobOpportunityId },
      include: { research: true }
    });
  }

  response.json(serializePerson(person));
}));

// Mark person as wrong candidate
peopleRouter.post("/:personId/mark-wrong", asyncHandler(async (request: AuthenticatedRequest, response) => {
  const { personId: personSlugOrId } = request.params;
  const { opportunitySlug, opportunityId: legacyOpportunityId, searchContext, notes } = request.body;

  // Accept either opportunitySlug or opportunityId (deprecated)
  const opportunityIdentifier = opportunitySlug ?? legacyOpportunityId;

  if (!opportunityIdentifier) {
    response.status(400).json({ error: "opportunitySlug or opportunityId is required" });
    return;
  }

  // Resolve person slug/ID to internal ID
  const personId = await resolvePersonId(personSlugOrId, request.auth.email);
  if (!personId) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  // Resolve opportunity slug/ID to internal ID
  const opportunityId = await resolveOpportunitySlug(opportunityIdentifier, request.auth.email);

  // Get person details
  const person = await prisma.person.findUnique({
    where: { id: personId },
    include: { research: true }
  });

  if (!person) {
    response.status(404).json({ error: "Person not found" });
    return;
  }

  // Create wrong candidate record
  const wrongCandidate = await prisma.wrongPersonCandidate.create({
    data: {
      opportunityId,
      searchContext: searchContext || person.name,
      personName: person.name,
      linkedinUrl: person.linkedinUrl || null,
      company: person.company || null,
      title: person.title || null,
      avatarUrl: person.avatarUrl || null,
      notes: notes || null
    }
  });

  // Delete the person and their research
  await prisma.person.delete({
    where: { id: personId }
  });

  console.log('[MARK WRONG PERSON] Created wrong candidate record and deleted person:', wrongCandidate.id);
  response.json({ success: true, wrongCandidateId: wrongCandidate.id });
}));

// Get wrong person candidates for an opportunity
peopleRouter.get("/wrong-candidates/:opportunityId", asyncHandler(async (request, response) => {
  const { opportunityId } = request.params;

  const wrongCandidates = await prisma.wrongPersonCandidate.findMany({
    where: { opportunityId },
    orderBy: { rejectedAt: "desc" }
  });

  response.json(wrongCandidates);
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
