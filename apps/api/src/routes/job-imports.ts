import { type Request, Router } from "express";

import { asyncHandler } from "../lib/http.js";
import { LinkedinJobImportService } from "../services/job-imports/linkedin-job-import-service.js";

type AuthenticatedRequest = Request & { auth: { email: string } };
type LinkedinJobImportServiceLike = Pick<LinkedinJobImportService, "importFromLinkedin">;
type LinkedinJobImportServiceFactory = () => LinkedinJobImportServiceLike;

let linkedinJobImportServiceFactory: LinkedinJobImportServiceFactory = () => new LinkedinJobImportService();

export function setLinkedinJobImportServiceFactoryForTests(factory: LinkedinJobImportServiceFactory) {
  linkedinJobImportServiceFactory = factory;
}

export function resetLinkedinJobImportServiceFactoryForTests() {
  linkedinJobImportServiceFactory = () => new LinkedinJobImportService();
}

export const jobImportsRouter = Router();

jobImportsRouter.post(
  "/linkedin",
  asyncHandler(async (request, response) => {
    const result = await linkedinJobImportServiceFactory().importFromLinkedin(
      request.body,
      (request as AuthenticatedRequest).auth.email
    );
    response.status(result.created ? 201 : 200).json(result);
  })
);
