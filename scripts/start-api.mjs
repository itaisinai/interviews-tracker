import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const candidates = ["dist/api/server.js", "dist/api/src/server.js", "dist/server.js"];
const entry = candidates.find((candidate) => fs.existsSync(path.resolve(candidate)));

if (!entry) {
  console.error(`Unable to find a built API entrypoint. Looked for: ${candidates.join(", ")}`);
  process.exit(1);
}

await import(pathToFileURL(path.resolve(entry)).href);
