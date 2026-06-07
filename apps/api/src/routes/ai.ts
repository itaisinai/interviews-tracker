import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { getAiParserService } from "../services/ai-parser-service.js";

export const aiRouter = Router();

aiRouter.post("/parse-job-description", asyncHandler(async (request, response) => {
  const { text } = z.object({ text: z.string().min(20) }).parse(request.body);
  response.json(await getAiParserService().parseJobDescription(text));
}));
