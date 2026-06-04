#!/usr/bin/env node

const fs = require("fs");

const backupFile = process.argv[2];
if (!backupFile) {
  console.error("Error: backup file path is required.");
  process.exit(1);
}

const sql = fs.readFileSync(backupFile, "utf8");
const importantTables = new Set(["JobOpportunity", "CompanySizeOption", "DomainOption", "Interaction"]);
let currentTable = null;
const rowsByTable = Object.fromEntries([...importantTables].map((table) => [table, 0]));

for (const line of sql.split(/\r?\n/)) {
  const copyMatch = /^COPY\s+(?:"?public"?\.)?"?([^"\s(]+)"?\s*\(/.exec(line);
  if (copyMatch) {
    currentTable = copyMatch[1];
    continue;
  }

  if (line === "\\.") {
    currentTable = null;
    continue;
  }

  if (currentTable && importantTables.has(currentTable) && line.length > 0) {
    rowsByTable[currentTable] += 1;
  }
}

const nonEmpty = Object.entries(rowsByTable).filter(([, count]) => count > 0);
if (nonEmpty.length === 0) {
  console.error("Backup completed but source database appears empty. Check SOURCE_DATABASE_URL.");
  process.exit(1);
}

process.stdout.write(nonEmpty.map(([table, count]) => `${table}:${count}`).join(", "));
