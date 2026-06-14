import fs from "node:fs";
import path from "node:path";

const runtimePackages = new Set([
  "@interviews-tracker/core",
  "@interviews-tracker/ai",
  "@interviews-tracker/integrations",
  "@interviews-tracker/logger",
  "@interviews-tracker/api-client"
]);

const packageRoot = path.resolve("packages");
const failures = [];

function collectExportTargets(exportsField, prefix = "exports") {
  if (typeof exportsField === "string") return [{ path: prefix, value: exportsField }];
  if (!exportsField || typeof exportsField !== "object") return [];
  return Object.entries(exportsField).flatMap(([key, value]) => collectExportTargets(value, `${prefix}.${key}`));
}

for (const dirent of fs.readdirSync(packageRoot, { withFileTypes: true })) {
  if (!dirent.isDirectory()) continue;
  const manifestPath = path.join(packageRoot, dirent.name, "package.json");
  if (!fs.existsSync(manifestPath)) continue;

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (!runtimePackages.has(manifest.name)) continue;

  const rootExport = manifest.exports?.["."];
  const defaultExport = typeof rootExport === "string" ? rootExport : rootExport?.default;
  const typesExport = typeof rootExport === "object" ? rootExport.types : undefined;

  if (defaultExport !== "./dist/index.js") {
    failures.push(`${manifest.name} must export default ./dist/index.js, found ${defaultExport ?? "<missing>"}`);
  }
  if (typesExport !== "./dist/index.d.ts") {
    failures.push(`${manifest.name} must export types ./dist/index.d.ts, found ${typesExport ?? "<missing>"}`);
  }

  for (const target of collectExportTargets(manifest.exports)) {
    if (typeof target.value === "string" && /(^|\/)src\/.*\.tsx?$/.test(target.value.replace(/^\.\//, ""))) {
      failures.push(`${manifest.name} ${target.path} points at source TypeScript: ${target.value}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Runtime package export validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Runtime package exports point to dist artifacts.");
