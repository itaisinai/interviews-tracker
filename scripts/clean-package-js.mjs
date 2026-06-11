import fs from "node:fs";
import path from "node:path";

const packageSrcRoot = path.resolve("packages");

function shouldDelete(filePath) {
  return (
    filePath.includes(`${path.sep}src${path.sep}`) &&
    (filePath.endsWith(".js") || filePath.endsWith(".js.map"))
  );
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (entry.isFile() && shouldDelete(fullPath)) {
      fs.rmSync(fullPath, { force: true });
    }
  }
}

if (fs.existsSync(packageSrcRoot)) {
  walk(packageSrcRoot);
}
