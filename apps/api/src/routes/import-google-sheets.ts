import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/http.js";
import { googleSheetsImportService } from "../services/google-sheets-import-service.js";

export const importGoogleSheetsRouter = Router();
const bodySchema = z.object({ spreadsheetId: z.string().optional(), sheetName: z.string().optional() });

function sheetId(value?: string) {
  return value ?? process.env.GOOGLE_SHEET_ID ?? "1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM";
}

importGoogleSheetsRouter.get("/status", asyncHandler(async (_request, response) => {
  response.json(googleSheetsImportService.getStatus());
}));

importGoogleSheetsRouter.post("/test", asyncHandler(async (request, response) => {
  const input = bodySchema.parse(request.body);
  response.json({ status: googleSheetsImportService.getStatus(), metadata: await googleSheetsImportService.getSpreadsheetMetadata(sheetId(input.spreadsheetId)) });
}));

importGoogleSheetsRouter.post("/preview", asyncHandler(async (request, response) => {
  const input = bodySchema.parse(request.body);
  const rows = await googleSheetsImportService.getSheetRows(sheetId(input.spreadsheetId), input.sheetName);
  response.json({ status: googleSheetsImportService.getStatus(), opportunities: googleSheetsImportService.mapRowsToJobOpportunities(rows) });
}));

importGoogleSheetsRouter.post("/run", asyncHandler(async (request, response) => {
  const input = bodySchema.parse(request.body);
  response.json({ status: googleSheetsImportService.getStatus(), importLog: await googleSheetsImportService.importJobOpportunitiesFromSheet(sheetId(input.spreadsheetId)) });
}));
