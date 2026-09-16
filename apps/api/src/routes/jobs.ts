import { Router } from "express";

import {
  createSavedSearchHandler,
  deleteSavedSearchHandler,
  getJobDetailsHandler,
  listSavedSearchesHandler,
  parseJobTitleHandler,
  searchJobsHandler,
} from "../controllers/jobs-controller.js";

export const jobsRouter = Router();

jobsRouter.post("/search", searchJobsHandler);
jobsRouter.post("/details", getJobDetailsHandler);
jobsRouter.post("/parse-title", parseJobTitleHandler);
jobsRouter.post("/saved-searches", createSavedSearchHandler);
jobsRouter.get("/saved-searches", listSavedSearchesHandler);
jobsRouter.delete("/saved-searches/:id", deleteSavedSearchHandler);
