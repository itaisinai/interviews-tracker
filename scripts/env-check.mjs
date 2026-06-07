import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const repoRoot = process.cwd();
const rootEnvPath = path.join(repoRoot, ".env");
const webEnvPath = path.join(repoRoot, "apps/web/.env");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return dotenv.parse(fs.readFileSync(filePath, "utf8"));
}

function hasValue(env, key) {
  return typeof env[key] === "string" && env[key].trim().length > 0;
}

function valueOrMissing(env, key) {
  return hasValue(env, key) ? "set" : "missing";
}

function printSection(title, entries) {
  console.log(title);
  for (const [key, value] of entries) {
    console.log(`  ${key}: ${value}`);
  }
}

const rootEnv = readEnvFile(rootEnvPath);
const frontendRequired = [
  "VITE_API_BASE_URL",
  "VITE_AUTH0_DOMAIN",
  "VITE_AUTH0_CLIENT_ID",
  "VITE_AUTH0_AUDIENCE",
  "VITE_ALLOWED_EMAIL"
];
const backendRequired = [
  "DATABASE_URL",
  "SOURCE_DATABASE_URL",
  "FRONTEND_ORIGIN",
  "PORT",
  "AUTH0_DOMAIN",
  "AUTH0_AUDIENCE",
  "ALLOWED_EMAIL",
  "AI_PROVIDER",
  "OPENAI_API_KEY",
  "OPENAI_MODEL"
];
const required = [...backendRequired, ...frontendRequired];
const missing = required.filter((key) => !hasValue(rootEnv, key));

console.log(`Root .env: ${fs.existsSync(rootEnvPath) ? "found" : "missing"}`);
console.log(`apps/web/.env: ${fs.existsSync(webEnvPath) ? "present (ignored in normal setup)" : "not present"}`);

printSection("Backend env", backendRequired.map((key) => [key, valueOrMissing(rootEnv, key)]));
printSection("Frontend env", frontendRequired.map((key) => [key, valueOrMissing(rootEnv, key)]));

console.log(`AUTH0_AUDIENCE match: ${rootEnv.AUTH0_AUDIENCE && rootEnv.VITE_AUTH0_AUDIENCE && rootEnv.AUTH0_AUDIENCE === rootEnv.VITE_AUTH0_AUDIENCE ? "MATCH" : "MISMATCH"}`);
console.log(`ALLOWED_EMAIL match: ${rootEnv.ALLOWED_EMAIL && rootEnv.VITE_ALLOWED_EMAIL && rootEnv.ALLOWED_EMAIL === rootEnv.VITE_ALLOWED_EMAIL ? "MATCH" : "MISMATCH"}`);

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("env:check passed");
}
