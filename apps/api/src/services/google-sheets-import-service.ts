import { google, sheets_v4 } from "googleapis";
import { JobStatus, PipelineType, Priority } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export type SheetMetadata = {
  title: string;
  sheets: string[];
};

export type MappedOpportunity = {
  companyName: string;
  roleTitle: string;
  pipelineType: PipelineType;
  status: JobStatus;
  priority: Priority;
  referrerOrConnection?: string | null;
  source?: string | null;
  jobUrl?: string | null;
  nextStep?: string | null;
  notes?: string | null;
  employees?: string | null;
  stage?: string | null;
  domain?: string | null;
  workModel?: string | null;
  location?: string | null;
  techStack?: string | null;
};

export type ImportStatus = {
  mode: "disabled" | "connected";
  enabled: boolean;
  sheetId: string;
  message: string;
};

function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY && process.env.GOOGLE_PROJECT_ID);
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

export class GoogleSheetsImportService {
  getStatus(): ImportStatus {
    const enabled = process.env.GOOGLE_SHEETS_ENABLED === "true";
    const sheetId = process.env.GOOGLE_SHEET_ID ?? "1su_MqFj9ulD1Dy-PQbge47J_dwkDlc3VTh41omIQ3aM";

    if (!enabled) {
      return { mode: "disabled", enabled, sheetId, message: "Google Sheets import is disabled. No mock sheet data is used." };
    }

    if (!configured()) {
      return { mode: "disabled", enabled, sheetId, message: "Google Sheets import is enabled but service account credentials are missing. Add credentials to import real sheet data." };
    }

    return { mode: "connected", enabled, sheetId, message: "Google Sheets import is configured with service account credentials." };
  }

  async getSpreadsheetMetadata(spreadsheetId: string): Promise<SheetMetadata> {
    if (this.getStatus().mode !== "connected") {
      return { title: "Google Sheets not connected", sheets: [] };
    }

    const sheets = google.sheets({ version: "v4", auth: this.getAuth() });
    const result = await sheets.spreadsheets.get({ spreadsheetId });
    return {
      title: result.data.properties?.title ?? "Untitled spreadsheet",
      sheets: result.data.sheets?.map((sheet) => sheet.properties?.title).filter((title): title is string => Boolean(title)) ?? []
    };
  }

  async getSheetRows(spreadsheetId: string, sheetName?: string): Promise<string[][]> {
    if (this.getStatus().mode !== "connected") {
      return [];
    }

    if (sheetName) {
      return this.getRowsForRange(spreadsheetId, sheetName);
    }

    const metadata = await this.getSpreadsheetMetadata(spreadsheetId);
    for (const range of metadata.sheets) {
      const rows = await this.getRowsForRange(spreadsheetId, range);
      if (this.mapRowsToJobOpportunities(rows).length > 0) {
        return rows;
      }
    }

    return [];
  }

  mapRowsToJobOpportunities(rows: string[][]): MappedOpportunity[] {
    const [header = [], ...data] = rows;
    const keys = header.map((cell) => cell.trim().toLowerCase());
    const value = (row: string[], name: string) => row[keys.indexOf(name)]?.trim() || null;

    return data
      .map((row) => ({
        companyName: value(row, "company") ?? value(row, "company name") ?? "",
        roleTitle: value(row, "role") ?? value(row, "role title") ?? "Software Engineer",
        status: this.toJobStatus(value(row, "status")),
        pipelineType: this.toPipelineType(value(row, "pipeline type")),
        priority: this.toPriority(value(row, "priority")),
        referrerOrConnection: value(row, "referrer"),
        source: "Google Sheets migration",
        jobUrl: this.extractUrl(
          value(row, "job url"),
          value(row, "job link"),
          value(row, "job"),
          value(row, "link"),
          value(row, "url"),
          value(row, "posting"),
          value(row, "job posting"),
          value(row, "role link"),
          value(row, "application link")
        ),
        nextStep: value(row, "next step"),
        notes: value(row, "details") ?? value(row, "notes"),
        employees: value(row, "employees"),
        stage: value(row, "stage"),
        domain: value(row, "domain"),
        workModel: value(row, "work model"),
        location: value(row, "location"),
        techStack: value(row, "tech fit")
      }))
      .filter((row) => row.companyName.length > 0);
  }

  async importJobOpportunitiesFromSheet(spreadsheetId: string) {
    const rows = await this.getSheetRows(spreadsheetId);
    const mapped = this.mapRowsToJobOpportunities(rows);
    const results: Array<{ companyName: string; roleTitle: string; action: "created" | "skipped" | "updated" }> = [];

    for (const opportunity of mapped) {
      const existing = await prisma.jobOpportunity.findUnique({
        where: { companyName_roleTitle: { companyName: opportunity.companyName, roleTitle: opportunity.roleTitle } }
      });

      if (existing) {
        results.push({ companyName: opportunity.companyName, roleTitle: opportunity.roleTitle, action: "skipped" });
        continue;
      }

      const employeesRange = opportunity.employees ? await prisma.companySizeOption.upsert({ where: { label: opportunity.employees }, create: { label: opportunity.employees }, update: {} }) : null;
      const companyStage = opportunity.stage ? await prisma.companyStageOption.upsert({ where: { label: opportunity.stage }, create: { label: opportunity.stage }, update: {} }) : null;
      const workModel = opportunity.workModel ? await prisma.workModelOption.upsert({ where: { label: opportunity.workModel }, create: { label: opportunity.workModel }, update: {} }) : null;
      const domain = opportunity.domain ? await prisma.domainOption.upsert({ where: { label: opportunity.domain }, create: { label: opportunity.domain }, update: {} }) : null;

      await prisma.jobOpportunity.create({
        data: {
          companyName: opportunity.companyName,
          roleTitle: opportunity.roleTitle,
          pipelineType: opportunity.pipelineType,
          status: opportunity.status,
          priority: opportunity.priority,
          referrerOrConnection: opportunity.referrerOrConnection,
          source: opportunity.source,
          jobUrl: opportunity.jobUrl,
          nextStep: opportunity.nextStep,
          notes: opportunity.notes,
          location: opportunity.location,
          techStack: opportunity.techStack,
          employeesRangeId: employeesRange?.id,
          companyStageId: companyStage?.id,
          workModelId: workModel?.id,
          domains: domain ? { create: [{ domain: { connect: { id: domain.id } } }] } : undefined
        }
      });
      results.push({ companyName: opportunity.companyName, roleTitle: opportunity.roleTitle, action: "created" });
    }

    return {
      created: results.filter((result) => result.action === "created").length,
      skipped: results.filter((result) => result.action === "skipped").length,
      updated: 0,
      results
    };
  }

  private getAuth() {
    return new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: normalizePrivateKey(process.env.GOOGLE_PRIVATE_KEY ?? ""),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
    });
  }

  private async getRowsForRange(spreadsheetId: string, range: string): Promise<string[][]> {
    const sheets = google.sheets({ version: "v4", auth: this.getAuth() });
    const [valuesResult, gridResult] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId, range, valueRenderOption: "FORMULA" }),
      sheets.spreadsheets.get({ spreadsheetId, ranges: [range], includeGridData: true })
    ]);
    const rows = (valuesResult.data.values ?? []).map((row) => row.map(String));
    const gridRows = gridResult.data.sheets?.[0]?.data?.[0]?.rowData ?? [];
    return this.mergeRichHyperlinks(rows, gridRows);
  }

  private toPriority(value: string | null): Priority {
    const normalized = value?.trim().toUpperCase();
    if (normalized && ["HIGH", "MEDIUM", "LOW", "MAYBE"].includes(normalized)) {
      return normalized as Priority;
    }
    return Priority.MEDIUM;
  }

  private toPipelineType(value: string | null): PipelineType {
    const normalized = value?.trim().toLowerCase();
    if (normalized?.includes("active")) return PipelineType.ACTIVE_PROCESS;
    if (normalized?.includes("archived")) return PipelineType.ARCHIVED;
    return PipelineType.POTENTIAL;
  }

  private toJobStatus(value: string | null): JobStatus {
    const normalized = value?.trim().toUpperCase().replaceAll(" ", "_").replaceAll("/", "_");
    if (normalized && Object.values(JobStatus).includes(normalized as JobStatus)) {
      return normalized as JobStatus;
    }
    if (value?.toLowerCase().includes("phone scheduled")) return JobStatus.PHONE_SCHEDULED;
    if (value?.toLowerCase().includes("waiting")) return JobStatus.RESEARCH_LEAD;
    if (value?.toLowerCase().includes("research")) return JobStatus.RESEARCH_LEAD;
    if (value?.toLowerCase().includes("final")) return JobStatus.FINAL_STAGE;
    if (value?.toLowerCase().includes("offer")) return JobStatus.OFFER;
    if (value?.toLowerCase().includes("rejected")) return JobStatus.REJECTED;
    return JobStatus.RESEARCH_LEAD;
  }

  private extractUrl(...values: Array<string | null>): string | null {
    for (const value of values) {
      if (!value) continue;
      const hyperlinkMatch = /^=?HYPERLINK\(["']([^"']+)["']/i.exec(value.trim());
      if (hyperlinkMatch?.[1]) return hyperlinkMatch[1];
      const urlMatch = /(https?:\/\/[^\s")]+)/i.exec(value);
      if (urlMatch?.[1]) return urlMatch[1];
    }
    return null;
  }

  private mergeRichHyperlinks(rows: string[][], gridRows: sheets_v4.Schema$RowData[]): string[][] {
    if (rows.length === 0) return rows;

    const output = rows.map((row) => [...row]);
    const keys = output[0].map((cell) => cell.trim().toLowerCase());
    const linkHeaders = new Set(["job url", "job link", "job", "link", "url", "posting", "job posting", "role link", "application link"]);
    const linkIndex = keys.findIndex((key) => linkHeaders.has(key));
    const hasDedicatedLinkColumn = linkIndex >= 0;

    if (!hasDedicatedLinkColumn) {
      output[0].push("job url");
    }

    for (let rowIndex = 1; rowIndex < output.length; rowIndex += 1) {
      const cells = gridRows[rowIndex]?.values ?? [];
      const hyperlink = hasDedicatedLinkColumn ? cells[linkIndex]?.hyperlink : cells.find((cell) => Boolean(cell.hyperlink))?.hyperlink;
      if (!hyperlink) continue;

      if (hasDedicatedLinkColumn) {
        output[rowIndex][linkIndex] = this.extractUrl(output[rowIndex][linkIndex] ?? null) ?? hyperlink;
      } else {
        output[rowIndex].push(hyperlink);
      }
    }

    return output;
  }
}

export const googleSheetsImportService = new GoogleSheetsImportService();
