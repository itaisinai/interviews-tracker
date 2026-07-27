import { createTimer, logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { applyCompanyResearch } from "../companies/company-research-apply-service.js";
import { getCompanyResearchService } from "../companies/company-research-service.js";
import { createResearchNotification } from "../notifications/notification-service.js";

export type CompanyResearchJobInput = {
  companyId: string;
  companyName: string;
  opportunityId: string;
  roleTitle?: string | null;
  ownerEmail: string;
};

export type CompanyResearchJobExecutor = (input: CompanyResearchJobInput) => Promise<void>;
export interface CompanyResearchJobService {
  enqueue(input: CompanyResearchJobInput): void;
}
const RECENT_RESEARCH_MS = 7 * 24 * 60 * 60 * 1000;
const inFlight = new Set<string>();

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Company research timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const executeCompanyResearchJob: CompanyResearchJobExecutor = async (input) => {
  const timer = createTimer("background-job", "automatic company research", {
    companyId: input.companyId,
    opportunityId: input.opportunityId,
  });
  let company: Awaited<ReturnType<typeof prisma.company.findFirst>>;
  try {
    company = await prisma.company.findFirst({ where: { id: input.companyId, ownerEmail: input.ownerEmail } });
    if (!company) throw new Error("Company not found for owner");
    if (company.lastResearchedAt && Date.now() - company.lastResearchedAt.getTime() < RECENT_RESEARCH_MS) {
      timer.end({ outcome: "skipped_recent" });
      return;
    }

    const research = await withTimeout(
      getCompanyResearchService().research({
        companyName: company.name,
        roleTitle: input.roleTitle,
        linkedinUrl: company.linkedinUrl,
        existingCompanyData: {
          companySearchName: company.searchName,
          linkedinUrl: company.linkedinUrl,
          funding: company.funding,
          customersTraction: company.customersTraction,
          companyDescription: company.description,
          productDescription: company.productDescription,
          location: company.location,
        },
      }),
      60_000
    );
    const updated = await applyCompanyResearch(company.id, input.ownerEmail, research);
    if (!updated) throw new Error("Company research application failed");
    try {
      await createResearchNotification({
        ...input,
        companyName: updated.name,
        companySlug: updated.slug,
        succeeded: true,
      });
    } catch (notificationError) {
      logger.error("company_research_success_notification_failed", notificationError, { companyId: input.companyId });
    }
    timer.end({ outcome: "completed" });
  } catch (error) {
    timer.fail(error, { outcome: "failed" });
    try {
      const latest = await prisma.company.findFirst({
        where: { id: input.companyId, ownerEmail: input.ownerEmail },
        select: { name: true, slug: true },
      });
      if (latest) {
        await createResearchNotification({
          ...input,
          companyName: latest.name,
          companySlug: latest.slug,
          succeeded: false,
        });
      }
    } catch (notificationError) {
      logger.error("company_research_failure_notification_failed", notificationError, { companyId: input.companyId });
    }
  }
};

export class InProcessCompanyResearchJobService implements CompanyResearchJobService {
  constructor(private readonly executor: CompanyResearchJobExecutor = executeCompanyResearchJob) {}

  enqueue(input: CompanyResearchJobInput): void {
    if (inFlight.has(input.companyId)) return;
    inFlight.add(input.companyId);
    try {
      setImmediate(() => {
        void this.executor(input)
          .catch((error) => logger.error("company_research_job_unhandled_error", error, { companyId: input.companyId }))
          .finally(() => inFlight.delete(input.companyId));
      });
    } catch (error) {
      inFlight.delete(input.companyId);
      logger.error("company_research_job_scheduling_failed", error, { companyId: input.companyId });
    }
  }
}

/** Queue seam: replace this implementation without changing opportunity creation. */
export const companyResearchJobService: CompanyResearchJobService = new InProcessCompanyResearchJobService();
