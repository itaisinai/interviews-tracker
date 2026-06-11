import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";

function extractVersion(raw) {
  const match = raw?.match(/(\d+\.\d+\.\d+)/);
  return match?.[1] ?? null;
}

async function readPlaywrightVersionFromNodeModules() {
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("@playwright/test/package.json");
    if (pkg?.version) return pkg.version;
  } catch {
    // Fall back to package.json below.
  }

  return null;
}

async function readPlaywrightVersionFromPackageJson() {
  const packageJsonUrl = new URL("../package.json", import.meta.url);
  const rawPackageJson = await readFile(packageJsonUrl, "utf8");
  const pkg = JSON.parse(rawPackageJson);
  const raw =
    pkg.devDependencies?.["@playwright/test"] ??
    pkg.dependencies?.["@playwright/test"] ??
    null;
  return extractVersion(raw);
}

export async function resolvePlaywrightVersion() {
  const fromNodeModules = await readPlaywrightVersionFromNodeModules();
  if (fromNodeModules) return fromNodeModules;

  const fromPackageJson = await readPlaywrightVersionFromPackageJson();
  if (fromPackageJson) return fromPackageJson;

  throw new Error(
    "Unable to determine Playwright version. Check @playwright/test in package.json.",
  );
}

export async function resolvePlaywrightImage() {
  const version = await resolvePlaywrightVersion();
  return `mcr.microsoft.com/playwright:v${version}-noble`;
}

