import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";

const builtCandidates = [
  "dist/api/server.js",
  "dist/api/src/server.js",
  "dist/api/apps/api/src/server.js",
  "dist/server.js",
  "apps/api/dist/server.js",
  "apps/api/dist/src/server.js"
];

const apiRuntimePackages = [
  {
    name: "@interviews-tracker/core",
    tsconfig: "packages/core/tsconfig.json",
    entrypoint: "packages/core/dist/index.js"
  },
  {
    name: "@interviews-tracker/ai",
    tsconfig: "packages/ai/tsconfig.json",
    entrypoint: "packages/ai/dist/index.js"
  },
  {
    name: "@interviews-tracker/integrations",
    tsconfig: "packages/integrations/tsconfig.json",
    entrypoint: "packages/integrations/dist/index.js"
  },
  {
    name: "@interviews-tracker/logger",
    tsconfig: "packages/logger/tsconfig.json",
    entrypoint: "packages/logger/dist/index.js"
  }
];

function findFirstExistingFile(paths) {
  return paths.find((candidate) => fs.existsSync(path.resolve(candidate)));
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env: process.env
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${signal ?? code}`));
    });
  });
}

function getTypescriptCli() {
  const cli = path.resolve("node_modules/typescript/bin/tsc");
  if (!fs.existsSync(cli)) {
    throw new Error(
      `Unable to build API runtime packages because TypeScript was not found at ${cli}. ` +
        `Run the Render build command \"yarn install --immutable && yarn build:api\" so workspace package artifacts are created during the build phase.`
    );
  }

  return cli;
}

async function ensureApiRuntimePackages() {
  const missingPackages = apiRuntimePackages.filter(
    ({ entrypoint }) => !fs.existsSync(path.resolve(entrypoint))
  );

  if (missingPackages.length === 0) return;

  console.warn(
    `Missing compiled API workspace package artifacts: ${missingPackages
      .map(({ name }) => name)
      .join(", ")}. Building them before starting the API.`
  );

  const tsc = getTypescriptCli();
  for (const { tsconfig } of apiRuntimePackages) {
    await run(process.execPath, [tsc, "-p", tsconfig]);
  }
}

async function runBuiltEntrypoint(entry) {
  await import(pathToFileURL(path.resolve(entry)).href);
}

function runSourceFallback() {
  console.warn(`Built API entrypoint not found. Falling back to source: apps/api/src/server.ts`);
  const child = spawn("tsx", ["apps/api/src/server.ts"], {
    stdio: "inherit",
    env: process.env
  });

  const shutdown = (signal) => {
    if (!child.killed) child.kill(signal);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 1);
  });
}

await ensureApiRuntimePackages();

const builtEntry = findFirstExistingFile(builtCandidates);

if (builtEntry) {
  await runBuiltEntrypoint(builtEntry);
} else {
  console.warn(`Unable to find a built API entrypoint. Looked for: ${builtCandidates.join(", ")}`);
  runSourceFallback();
}
