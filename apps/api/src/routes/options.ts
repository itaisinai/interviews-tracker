import { Router } from "express";
import { z } from "zod";

import { asyncHandler } from "../lib/http.js";
import { getOptions } from "../services/options/option-catalog-cache.js";
import { createDomainOption, createOption, deleteOption } from "../services/options/option-catalog-service.js";

export const optionsRouter = Router();

const labelSchema = z.object({ label: z.string().min(1) });

optionsRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    response.json(await getOptions());
  })
);

optionsRouter.post(
  "/domain",
  asyncHandler(async (request, response) => {
    const { label } = labelSchema.parse(request.body);
    response.status(201).json(await createDomainOption(label));
  })
);

optionsRouter.post(
  "/:kind",
  asyncHandler(async (request, response) => {
    const { label } = labelSchema.parse(request.body);
    const option = await createOption(request.params.kind, label);

    if (!option) {
      response.status(404).json({ message: "Unknown option list" });
      return;
    }

    response.status(201).json(option);
  })
);

optionsRouter.delete(
  "/:kind/:id",
  asyncHandler(async (request, response) => {
    const deleted = await deleteOption(request.params.kind, request.params.id);
    if (!deleted) {
      response.status(404).json({ message: "Unknown option list" });
      return;
    }

    response.status(204).end();
  })
);
