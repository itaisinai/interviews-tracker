import { prisma } from "../../lib/prisma.js";

export type OptionsResponse = Awaited<ReturnType<typeof loadOptions>>;

let cachedOptions: OptionsResponse | null = null;
let cachedPromise: Promise<OptionsResponse> | null = null;

async function loadOptions() {
  const [companySizes, companyStages, domains, workModels, interactionTypes, interviewStages] = await Promise.all([
    prisma.companySizeOption.findMany({ orderBy: { label: "asc" } }),
    prisma.companyStageOption.findMany({ orderBy: { label: "asc" } }),
    prisma.domainOption.findMany({ orderBy: { label: "asc" } }),
    prisma.workModelOption.findMany({ orderBy: { label: "asc" } }),
    prisma.interactionTypeOption.findMany({ orderBy: { label: "asc" } }),
    prisma.interviewStageOption.findMany({ orderBy: { label: "asc" } })
  ]);

  return { companySizes, companyStages, domains, workModels, interactionTypes, interviewStages };
}

export async function getOptions() {
  if (cachedOptions) {
    return cachedOptions;
  }

  if (!cachedPromise) {
    cachedPromise = loadOptions().then((options) => {
      cachedOptions = options;
      cachedPromise = null;
      return options;
    });
  }

  return cachedPromise;
}

export function invalidateOptionsCache() {
  cachedOptions = null;
  cachedPromise = null;
}
