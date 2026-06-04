#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
BACKUP_FILE="${1:-${ROOT_DIR}/backup-data.sql}"

trap 'echo "Backup failed." >&2' ERR

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: .env was not found at ${ENV_FILE}." >&2
  exit 1
fi

SOURCE_DATABASE_URL="$(ENV_FILE="${ENV_FILE}" node <<'NODE'
const dotenv = require("dotenv");
const envFile = process.env.ENV_FILE;
const result = dotenv.config({ path: envFile });

if (result.error) {
  console.error(`Error: failed to load ${envFile}.`);
  process.exit(1);
}

const rawUrl = process.env.SOURCE_DATABASE_URL;
if (!rawUrl) {
  console.error("Error: SOURCE_DATABASE_URL is missing or empty in .env.");
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("Error: SOURCE_DATABASE_URL is not a valid URL.");
  process.exit(1);
}

if (!["postgresql:", "postgres:"].includes(url.protocol)) {
  console.error("Error: SOURCE_DATABASE_URL must use postgres:// or postgresql://.");
  process.exit(1);
}

url.searchParams.delete("schema");
process.stdout.write(url.toString());
NODE
)"

SOURCE_DATABASE_URL_FOR_DOCKER="$(SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL}" node <<'NODE'
const url = new URL(process.env.SOURCE_DATABASE_URL);
if (["localhost", "127.0.0.1"].includes(url.hostname) && (!url.port || url.port === "5433")) {
  url.hostname = "localhost";
  url.port = "5432";
}
process.stdout.write(url.toString());
NODE
)"

SOURCE_SUMMARY="$(SOURCE_DATABASE_URL="${SOURCE_DATABASE_URL}" node <<'NODE'
const url = new URL(process.env.SOURCE_DATABASE_URL);
process.stdout.write(`${url.hostname}/${url.pathname.replace(/^\//, "")}`);
NODE
)"

echo "Backing up ${SOURCE_SUMMARY} into ${BACKUP_FILE}"
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "${SOURCE_DATABASE_URL}" --data-only --no-owner --no-privileges --exclude-table=_prisma_migrations > "${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1; then
  echo "pg_dump was not found on PATH. Falling back to Docker Compose postgres service."
  docker compose exec -T postgres pg_dump "${SOURCE_DATABASE_URL_FOR_DOCKER}" --data-only --no-owner --no-privileges --exclude-table=_prisma_migrations > "${BACKUP_FILE}"
else
  echo "Error: pg_dump is not installed and Docker is not available for fallback." >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: backup file was not created: ${BACKUP_FILE}." >&2
  exit 1
fi

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "Error: backup file is empty after export: ${BACKUP_FILE}." >&2
  exit 1
fi

BACKUP_SIZE="$(wc -c < "${BACKUP_FILE}" | tr -d '[:space:]')"
NON_EMPTY_IMPORTANT_TABLES="$(node "${ROOT_DIR}/scripts/validate-backup.cjs" "${BACKUP_FILE}")"

echo "Backup completed successfully. File size: ${BACKUP_SIZE} bytes."
echo "Important table rows found: ${NON_EMPTY_IMPORTANT_TABLES}"
