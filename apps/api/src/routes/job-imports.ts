import { Router, type Request } from "express";
import { asyncHandler } from "../lib/http.js";
import { LinkedinJobImportService } from "../services/job-imports/linkedin-job-import-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };

export const jobImportsRouter = Router();

jobImportsRouter.post("/linkedin", asyncHandler(async (request, response) => {
  const result = await new LinkedinJobImportService().importFromLinkedin(request.body, (request as AuthenticatedRequest).auth.email);
  response.status(result.created ? 201 : 200).json(result);
}));
