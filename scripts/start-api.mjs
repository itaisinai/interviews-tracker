import { pathToFileURL } from "node:url";
import path from "node:path";
import fs from "node:fs";

const builtEntry = "dist/api/server.mjs";

if (!fs.existsSync(path.resolve(builtEntry))) {
  console.error("API build artifacts are missing. Run yarn build:api first.");
  console.error(`Expected: ${builtEntry}`);
  process.exit(1);
}

await import(pathToFileURL(path.resolve(builtEntry)).href);
