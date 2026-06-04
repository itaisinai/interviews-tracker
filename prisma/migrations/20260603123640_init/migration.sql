-- CreateEnum
CREATE TYPE "PipelineType" AS ENUM ('POTENTIAL', 'ACTIVE_PROCESS', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'MAYBE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RESEARCH_LEAD', 'TO_APPLY', 'APPLIED', 'RECRUITER_REACHED_OUT', 'PHONE_SCHEDULED', 'PHONE_DONE', 'TECHNICAL_SCHEDULED', 'TECHNICAL_DONE', 'HOME_ASSIGNMENT', 'ASSIGNMENT_SUBMITTED', 'FINAL_STAGE', 'OFFER', 'REJECTED', 'PAUSED', 'NOT_RELEVANT');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('SCHEDULED', 'DONE', 'CANCELLED', 'NEEDS_FOLLOW_UP');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('NOT_DISCUSSED', 'DISCUSSED', 'VERBAL_OFFER', 'WRITTEN_OFFER', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "JobOpportunity" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL,
    "pipelineType" "PipelineType" NOT NULL,
    "status" "JobStatus" NOT NULL,
    "priority" "Priority" NOT NULL,
    "referrerOrConnection" TEXT,
    "source" TEXT,
    "jobUrl" TEXT,
    "nextStep" TEXT,
    "notes" TEXT,
    "employeesRangeId" TEXT,
    "companyStageId" TEXT,
    "workModelId" TEXT,
    "location" TEXT,
    "funding" TEXT,
    "companyDescription" TEXT,
    "productDescription" TEXT,
    "customersTraction" TEXT,
    "techStack" TEXT,
    "backendFrontendSplit" TEXT,
    "compensationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "jobOpportunityId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "stage" TEXT,
    "status" "InteractionStatus" NOT NULL,
    "personName" TEXT,
    "personRole" TEXT,
    "agenda" TEXT,
    "notes" TEXT,
    "outcome" TEXT,
    "followUp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "jobOpportunityId" TEXT,
    "interactionId" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "jobOpportunityId" TEXT,
    "interactionId" TEXT,
    "title" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL,
    "priority" "Priority" NOT NULL,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compensation" (
    "id" TEXT NOT NULL,
    "jobOpportunityId" TEXT NOT NULL,
    "baseSalary" TEXT,
    "equity" TEXT,
    "bonus" TEXT,
    "signingBonus" TEXT,
    "benefits" TEXT,
    "vacationDays" TEXT,
    "workModelNotes" TEXT,
    "negotiationNotes" TEXT,
    "offerStatus" "OfferStatus" NOT NULL DEFAULT 'NOT_DISCUSSED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compensation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySizeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySizeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyStageOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyStageOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkModelOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkModelOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InteractionTypeOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InteractionTypeOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewStageOption" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterviewStageOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobOpportunityDomain" (
    "jobOpportunityId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,

    CONSTRAINT "JobOpportunityDomain_pkey" PRIMARY KEY ("jobOpportunityId","domainId")
);

-- CreateIndex
CREATE INDEX "JobOpportunity_pipelineType_idx" ON "JobOpportunity"("pipelineType");

-- CreateIndex
CREATE INDEX "JobOpportunity_status_idx" ON "JobOpportunity"("status");

-- CreateIndex
CREATE INDEX "JobOpportunity_priority_idx" ON "JobOpportunity"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "JobOpportunity_companyName_roleTitle_key" ON "JobOpportunity"("companyName", "roleTitle");

-- CreateIndex
CREATE INDEX "Interaction_date_idx" ON "Interaction"("date");

-- CreateIndex
CREATE INDEX "Interaction_status_idx" ON "Interaction"("status");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Compensation_jobOpportunityId_key" ON "Compensation"("jobOpportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySizeOption_label_key" ON "CompanySizeOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyStageOption_label_key" ON "CompanyStageOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "DomainOption_label_key" ON "DomainOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "WorkModelOption_label_key" ON "WorkModelOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "InteractionTypeOption_label_key" ON "InteractionTypeOption"("label");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewStageOption_label_key" ON "InterviewStageOption"("label");

-- AddForeignKey
ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_employeesRangeId_fkey" FOREIGN KEY ("employeesRangeId") REFERENCES "CompanySizeOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_companyStageId_fkey" FOREIGN KEY ("companyStageId") REFERENCES "CompanyStageOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpportunity" ADD CONSTRAINT "JobOpportunity_workModelId_fkey" FOREIGN KEY ("workModelId") REFERENCES "WorkModelOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compensation" ADD CONSTRAINT "Compensation_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpportunityDomain" ADD CONSTRAINT "JobOpportunityDomain_jobOpportunityId_fkey" FOREIGN KEY ("jobOpportunityId") REFERENCES "JobOpportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobOpportunityDomain" ADD CONSTRAINT "JobOpportunityDomain_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "DomainOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
