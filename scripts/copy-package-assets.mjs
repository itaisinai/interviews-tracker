import fs from "node:fs";
import path from "node:path";

const packageRoot = process.argv[2];

if (!packageRoot) {
  throw new Error("Usage: node scripts/copy-package-assets.mjs <package-root>");
}

const srcRoot = path.resolve(packageRoot, "src");
const distRoot = path.resolve(packageRoot, "dist");

function copyAssets(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const source = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      copyAssets(source);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".css")) {
      continue;
    }

    const relativePath = path.relative(srcRoot, source);
    const target = path.join(distRoot, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
}

if (fs.existsSync(srcRoot)) {
  copyAssets(srcRoot);
}
