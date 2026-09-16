import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { getAiService } from "../services/ai/ai-service.js";
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
  const aiService = getAiService();

  const prompt = `Extract the job title and company name from this LinkedIn job posting title. Return ONLY a JSON object with "jobTitle" and "companyName" fields. If you can't determine either, use null.

Title: "${title}"

Example response format:
{"jobTitle": "Senior Full Stack Engineer", "companyName": "Acme Corp"}`;

  try {
    const result = await aiService.chat([{ role: "user", content: prompt }], {
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(result.content);
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
