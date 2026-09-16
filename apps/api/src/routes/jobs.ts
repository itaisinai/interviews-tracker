import { Router } from "express";

import { getJobDetailsHandler, searchJobsHandler } from "../controllers/jobs-controller.js";

export const jobsRouter = Router();

jobsRouter.post("/search", searchJobsHandler);
jobsRouter.post("/details", getJobDetailsHandler);
