import process from "node:process";
import { resolvePlaywrightImage, resolvePlaywrightVersion } from "./playwright-image.mjs";

const actualImage = await resolvePlaywrightImage();
const actualVersion = await resolvePlaywrightVersion();
const configuredImage = process.env.PLAYWRIGHT_DOCKER_IMAGE;

if (!configuredImage) {
  console.error(
    "PLAYWRIGHT_DOCKER_IMAGE is not set. Set it to the Playwright Docker image used by CI.",
  );
  process.exit(1);
}

if (configuredImage !== actualImage) {
  console.error(
    [
      "Playwright Docker image mismatch.",
      `Expected from package.json/node_modules: ${actualImage}`,
      `Configured in CI: ${configuredImage}`,
      `Playwright version: ${actualVersion}`,
      "Update the workflow image tag to match @playwright/test exactly.",
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Playwright Docker image matches ${configuredImage}`);

