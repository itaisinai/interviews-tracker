import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";
import { getJobSearchService } from "../services/job-search/job-search-service.js";

const searchJobsSchema = z.object({
  query: z.string().min(1),
  location: z.string().optional(),
  remoteOnly: z.boolean().optional(),
  limit: z.number().min(1).max(50).optional(),
});

export const searchJobsHandler = asyncHandler(async (request, response) => {
  const body = searchJobsSchema.parse(request.body);
  const service = getJobSearchService();

  const results = await service.search(body);
  response.json(results);
});

export const getJobDetailsHandler = asyncHandler(async (request, response) => {
  const { url } = z.object({ url: z.string().url() }).parse(request.body);
  const service = getJobSearchService();

  const result = await service.getJobDetails(url);
  response.json(result);
});

export const parseJobTitleHandler = asyncHandler(async (request, response) => {
  const { title } = z.object({ title: z.string() }).parse(request.body);
  const aiService = getAiParserService();

  const schema = z.object({
    jobTitle: z.string().nullable(),
    companyName: z.string().nullable(),
  });

  try {
    const result = await aiService.createStructuredOutput({
      name: "parseJobTitle",
      schema: schema,
      systemPrompt:
        "Extract the job title and company name from LinkedIn job posting titles. Return jobTitle and companyName fields.",
      text: `Parse this LinkedIn job title:\n\n${title}`,
    });

    const parsed = JSON.parse(result);
    response.json({
      jobTitle: parsed.jobTitle || null,
      companyName: parsed.companyName || null,
    });
  } catch (error) {
    // Fallback to original title if AI fails
    response.json({
      jobTitle: title,
      companyName: null,
    });
  }
});
