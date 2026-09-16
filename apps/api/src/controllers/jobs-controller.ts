import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
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
