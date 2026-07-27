import { prisma } from "../../lib/prisma.js";

export const COMPANY_RESEARCH_COMPLETED = "COMPANY_RESEARCH_COMPLETED";
export const COMPANY_RESEARCH_FAILED = "COMPANY_RESEARCH_FAILED";

export function createResearchNotification(input: {
  ownerEmail: string;
  companyId: string;
  companyName: string;
  companySlug: string;
  opportunityId: string;
  succeeded: boolean;
}) {
  return prisma.notification.create({
    data: {
      ownerEmail: input.ownerEmail,
      type: input.succeeded ? COMPANY_RESEARCH_COMPLETED : COMPANY_RESEARCH_FAILED,
      title: input.succeeded ? "Company research completed" : "Company research failed",
      message: input.succeeded
        ? `The company profile for ${input.companyName} was updated.`
        : `We could not update the company profile for ${input.companyName}. Open the company to try again.`,
      entityType: "company",
      entityId: input.companyId,
      metadata: {
        companyName: input.companyName,
        companySlug: input.companySlug,
        opportunityId: input.opportunityId,
      },
    },
  });
}
