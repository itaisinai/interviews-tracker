import { PrismaClient, Priority, JobStatus, PipelineType, InteractionStatus, TaskStatus } from "@prisma/client";

const prisma = new PrismaClient();

const sizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1001-5000", "5001-10000", "10000+", "Unknown", "Custom", "~50", "90", "300", "2K", "10K", "1.5M", "1.9K", "5K", "1.5K", "14K", "1K", "180K"];
const stages = ["Idea", "Seed", "Series A", "Series B", "Growth Startup", "Growth AI Startup", "Scaleup", "Enterprise", "Big Tech", "Public Company", "Unknown", "Custom"];
const domains = ["AI", "AI Agents", "Customer Support", "Cybersecurity", "Fintech", "Healthcare", "E-commerce", "Gaming", "SaaS", "Developer Tools", "Data / Analytics", "Design / Collaboration", "Mobility", "Mobility / Routing", "Marketing Analytics", "Enterprise Software", "Revenue Intelligence", "Design / Engineering Software", "Gaming / Platform", "Other"];
const workModels = ["Remote", "Hybrid", "Office", "1 day office", "2 days office", "3 days office", "4 days office", "5 days office", "Unknown", "Custom"];
const interactionTypes = ["Recruiter Call", "Phone Screen", "Technical Interview", "Home Assignment", "Assignment Review", "System Design", "Hiring Manager", "Final Interview", "Offer Call", "Follow-up Email", "Rejection Call", "Other"];
const interviewStages = ["Intro", "Recruiter", "Technical", "Home Assignment", "Assignment Review", "System Design", "Hiring Manager", "Final", "Offer", "Follow-up", "Other"];

async function upsertOption(model: "companySizeOption" | "companyStageOption" | "domainOption" | "workModelOption" | "interactionTypeOption" | "interviewStageOption", label: string) {
  if (model === "companySizeOption") return prisma.companySizeOption.upsert({ where: { label }, create: { label }, update: {} });
  if (model === "companyStageOption") return prisma.companyStageOption.upsert({ where: { label }, create: { label }, update: {} });
  if (model === "domainOption") return prisma.domainOption.upsert({ where: { label }, create: { label }, update: {} });
  if (model === "workModelOption") return prisma.workModelOption.upsert({ where: { label }, create: { label }, update: {} });
  if (model === "interactionTypeOption") return prisma.interactionTypeOption.upsert({ where: { label }, create: { label }, update: {} });
  return prisma.interviewStageOption.upsert({ where: { label }, create: { label }, update: {} });
}

async function connectDomains(labels: string[]) {
  const records = await Promise.all(labels.map((label) => upsertOption("domainOption", label)));
  return records.map((domain: { id: string }) => ({ domain: { connect: { id: domain.id } } }));
}

async function main() {
  await Promise.all(sizes.map((label) => upsertOption("companySizeOption", label)));
  await Promise.all(stages.map((label) => upsertOption("companyStageOption", label)));
  await Promise.all(domains.map((label) => upsertOption("domainOption", label)));
  await Promise.all(workModels.map((label) => upsertOption("workModelOption", label)));
  await Promise.all(interactionTypes.map((label) => upsertOption("interactionTypeOption", label)));
  await Promise.all(interviewStages.map((label) => upsertOption("interviewStageOption", label)));

  const notchSize = await upsertOption("companySizeOption", "~50");
  const notchStage = await upsertOption("companyStageOption", "Growth AI Startup");
  const office = await upsertOption("workModelOption", "5 days office");
  const notch = await prisma.jobOpportunity.upsert({
    where: { companyName_roleTitle: { companyName: "Notch", roleTitle: "Full Stack Developer" } },
    update: {},
    create: {
      companyName: "Notch",
      roleTitle: "Full Stack Developer",
      pipelineType: PipelineType.ACTIVE_PROCESS,
      status: JobStatus.PHONE_SCHEDULED,
      priority: Priority.HIGH,
      referrerOrConnection: "Recruiter reached out",
      employeesRangeId: notchSize.id,
      companyStageId: notchStage.id,
      workModelId: office.id,
      location: "Ramat Gan",
      funding: "$45M",
      companyDescription: "Growing AI startup with a new NYC office.",
      productDescription: "Autonomous AI customer support platform for external customer-facing and internal organizational workflows.",
      customersTraction: "10M+ support tickets solved, 30+ enterprise customers across e-commerce, gaming, SaaS, insurance, investments, telecom, healthcare and more.",
      techStack: "Node.js, React hooks, TypeScript, PostgreSQL, Redis",
      backendFrontendSplit: "~70% Node / 30% React",
      nextStep: "Prepare recruiter call",
      domains: { create: await connectDomains(["AI", "AI Agents", "Customer Support"]) },
      compensation: { create: { offerStatus: "NOT_DISCUSSED", workModelNotes: "5 days office" } }
    }
  });

  await prisma.interaction.upsert({
    where: { id: "seed-notch-recruiter-call" },
    update: {},
    create: {
      id: "seed-notch-recruiter-call",
      jobOpportunityId: notch.id,
      date: new Date("2026-06-08T09:00:00.000Z"),
      type: "Recruiter Call",
      stage: "Intro",
      personName: "Recruiter",
      status: InteractionStatus.SCHEDULED,
      agenda: "Understand role, process, expectations, backend/frontend split, office policy, product maturity, compensation range, and interview process.",
      followUp: "Update opportunity status after call."
    }
  });

  await prisma.task.upsert({
    where: { id: "seed-notch-task" },
    update: {},
    create: {
      id: "seed-notch-task",
      jobOpportunityId: notch.id,
      title: "Prepare Notch recruiter call",
      status: TaskStatus.PENDING,
      priority: Priority.HIGH,
      dueDate: new Date("2026-06-08T09:00:00.000Z"),
      notes: "Prepare questions about role, backend/frontend split, office policy, product maturity, compensation range, and interview process."
    }
  });

  await prisma.note.upsert({
    where: { id: "seed-notch-note" },
    update: {},
    create: {
      id: "seed-notch-note",
      jobOpportunityId: notch.id,
      title: "Research notes",
      category: "Company Research",
      content: "Validate AI customer support positioning, enterprise traction, and onsite expectations before the recruiter call."
    }
  });

  const potential = [
    ["Oligo", "Software Engineer", "90", "Other", "Avi Lu", Priority.MEDIUM, null],
    ["Buildots", "Senior Frontend Engineer", "300", "Other", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4383675894"],
    ["Wiz", "Frontend Engineer", "2K", "Cybersecurity", "Omri Mor?", Priority.HIGH, "https://www.linkedin.com/jobs/view/4337327367/"],
    ["CrowdStrike", "Senior Frontend Engineer", "10K", "Cybersecurity", null, Priority.MEDIUM, "https://crowdstrike.wd5.myworkdayjobs.com/en-US/crowdstrikecareers/job/Sr-Engineer--Front-End---Falcon-Cloud-Security--Hybrid--ISR-_R27109"],
    ["Amazon / Interets AI", "Full Stack Engineer", "1.5M", "AI", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4375619558"],
    ["Figma", "Full Stack Engineer", "1.9K", "Design / Collaboration", null, Priority.HIGH, "https://www.linkedin.com/jobs/view/4319884238"],
    ["Unity", "Senior Full-Stack Engineer", "5K", "Gaming / Platform", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4404373671"],
    ["AppsFlyer", "Full Stack Engineer", "1.5K", "Marketing Analytics", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4402131828"],
    ["Gong", "Senior Full Stack Engineer - Frontend Oriented", "2K", "Revenue Intelligence", null, Priority.HIGH, "https://www.linkedin.com/jobs/view/4390839000"],
    ["Autodesk", "Senior Full Stack Engineer - Frontend Oriented", "14K", "Design / Engineering Software", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4363443790"],
    ["Via", "Senior Software Engineer, Routing", "1K", "Mobility / Routing", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4404728967"],
    ["Google", "Software Engineer III, Full Stack", "180K", "Other", null, Priority.HIGH, "https://www.linkedin.com/jobs/view/4394203435"],
    ["Daylight", "Senior Frontend Engineer", "Unknown", "Other", null, Priority.MEDIUM, "https://www.linkedin.com/jobs/view/4368762462"]
  ] as const;

  for (const [companyName, roleTitle, employees, domain, referrer, priority, jobUrl] of potential) {
    const size = await upsertOption("companySizeOption", employees);
    const stage = companyName.includes("Google") || companyName.includes("Amazon") ? await upsertOption("companyStageOption", "Big Tech") : undefined;
    await prisma.jobOpportunity.upsert({
      where: { companyName_roleTitle: { companyName, roleTitle } },
      update: { jobUrl },
      create: {
        companyName,
        roleTitle,
        pipelineType: PipelineType.POTENTIAL,
        status: JobStatus.RESEARCH_LEAD,
        priority,
        referrerOrConnection: referrer,
        jobUrl,
        employeesRangeId: size.id,
        companyStageId: stage?.id,
        nextStep: companyName === "Oligo" ? "Waiting for answer" : "Research role and decide whether to apply",
        domains: { create: await connectDomains([domain]) }
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
