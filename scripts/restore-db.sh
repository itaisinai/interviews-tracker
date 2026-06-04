#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
BACKUP_FILE="${1:-${ROOT_DIR}/backup-data.sql}"

trap 'echo "Restore failed." >&2' ERR

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Error: .env was not found at ${ENV_FILE}." >&2
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Error: backup file was not found at ${BACKUP_FILE}." >&2
  exit 1
fi

if [[ ! -s "${BACKUP_FILE}" ]]; then
  echo "Error: backup file is empty: ${BACKUP_FILE}." >&2
  exit 1
fi

if grep -q '_prisma_migrations' "${BACKUP_FILE}"; then
  echo "Error: backup file contains _prisma_migrations. Recreate it with yarn db:backup before restoring." >&2
  exit 1
fi

DATABASE_URL="$(ENV_FILE="${ENV_FILE}" node <<'NODE'
const dotenv = require("dotenv");
const envFile = process.env.ENV_FILE;
const result = dotenv.config({ path: envFile });

if (result.error) {
  console.error(`Error: failed to load ${envFile}.`);
  process.exit(1);
}

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) {
  console.error("Error: DATABASE_URL is missing or empty in .env.");
  process.exit(1);
}

let url;
try {
  url = new URL(rawUrl);
} catch {
  console.error("Error: DATABASE_URL is not a valid URL.");
  process.exit(1);
}

if (!["postgresql:", "postgres:"].includes(url.protocol)) {
  console.error("Error: DATABASE_URL must use postgres:// or postgresql://.");
  process.exit(1);
}

if (!url.searchParams.has("sslmode")) {
  url.searchParams.set("sslmode", "require");
}

url.searchParams.delete("schema");
process.stdout.write(url.toString());
NODE
)"

TARGET_SUMMARY="$(DATABASE_URL="${DATABASE_URL}" node <<'NODE'
const url = new URL(process.env.DATABASE_URL);
process.stdout.write(`${url.hostname}/${url.pathname.replace(/^\//, "")}`);
NODE
)"

echo "Restoring ${BACKUP_FILE} into ${TARGET_SUMMARY}"
if command -v psql >/dev/null 2>&1; then
  psql "${DATABASE_URL}" < "${BACKUP_FILE}"
elif command -v docker >/dev/null 2>&1; then
  echo "psql was not found on PATH. Falling back to Docker Compose postgres service."
  docker compose exec -T postgres psql "${DATABASE_URL}" < "${BACKUP_FILE}"
else
  echo "Error: psql is not installed and Docker is not available for fallback." >&2
  exit 1
fi
RESTORE_SIZE="$(wc -c < "${BACKUP_FILE}" | tr -d '[:space:]')"
echo "Restore completed successfully from ${RESTORE_SIZE} bytes."
echo "Target counts after restore:"
yarn db:counts
