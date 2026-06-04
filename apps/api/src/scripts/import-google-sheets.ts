import "dotenv/config";
import { googleSheetsImportService } from "../services/google-sheets-import-service.js";

const spreadsheetId = process.env.GOOGLE_SHEET_ID ?? "1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM";
const result = await googleSheetsImportService.importJobOpportunitiesFromSheet(spreadsheetId);
console.log(JSON.stringify(result, null, 2));
