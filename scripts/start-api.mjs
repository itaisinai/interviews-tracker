import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const builtCandidates = [
  "dist/api/server.js",
  "dist/api/src/server.js",
  "dist/api/apps/api/src/server.js",
  "dist/server.js",
  "apps/api/dist/server.js",
  "apps/api/dist/src/server.js"
];

function findFirstExistingFile(paths) {
  return paths.find((candidate) => fs.existsSync(path.resolve(candidate)));
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

const builtEntry = findFirstExistingFile(builtCandidates);

if (builtEntry) {
  await runBuiltEntrypoint(builtEntry);
} else {
  console.warn(`Unable to find a built API entrypoint. Looked for: ${builtCandidates.join(", ")}`);
  runSourceFallback();
}
