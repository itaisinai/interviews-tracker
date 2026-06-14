import fs from "node:fs";
import path from "node:path";
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

const builtEntry = findFirstExistingFile(builtCandidates);

if (!builtEntry) {
  console.error("API build artifacts are missing. Run yarn build:api first.");
  console.error(`Looked for: ${builtCandidates.join(", ")}`);
  process.exit(1);
}

await import(pathToFileURL(path.resolve(builtEntry)).href);
