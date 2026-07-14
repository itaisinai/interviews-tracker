import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { getAiParserService } from "../services/ai/ai-parser-service.js";

export const aiRouter = Router();

aiRouter.post(
  "/parse-job-description",
  asyncHandler(async (request, response) => {
    console.log("[AI ROUTE] Received parse request");
    const { text } = z.object({ text: z.string().min(20) }).parse(request.body);
    console.log("[AI ROUTE] Text length:", text.length);
    console.log("[AI ROUTE] Text preview:", text.slice(0, 200));

    const result = await getAiParserService().parseJobDescription(text);

    console.log("[AI ROUTE] Parser returned - companyName:", result.companyName);
    console.log("[AI ROUTE] Parser returned - product:", result.product);
    console.log("[AI ROUTE] Sending response to client");

    response.json(result);
  })
);
