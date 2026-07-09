#!/usr/bin/env node

/**
 * Load environment variables from AWS SSM Parameter Store
 * and write them to a temporary .env file for Vite to pick up
 */

import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, "..");
const ENV_SSM_PATH = resolve(ROOT_DIR, ".env.local");

async function loadFromSSM() {
  try {
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "eu-central-1";
    const ssmPath = "/interviews-tracker/prod";

    console.log(`📡 Loading environment variables from AWS SSM...`);
    console.log(`   Path: ${ssmPath}`);
    console.log(`   Region: ${region}`);

    const client = new SSMClient({ region });
    const params = {};
    let nextToken;

    do {
      const response = await client.send(
        new GetParametersByPathCommand({
          Path: ssmPath,
          WithDecryption: true,
          Recursive: true,
          MaxResults: 10,
          NextToken: nextToken,
        })
      );

      for (const param of response.Parameters ?? []) {
        if (param.Name && param.Value) {
          const varName = param.Name.split("/").pop();
          params[varName] = param.Value;
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    console.log(`✓ Retrieved ${Object.keys(params).length} parameters from SSM`);
    return params;
  } catch (error) {
    console.warn("⚠️  Could not load from SSM:", error.message);
    console.warn("   Continuing without SSM parameters...");
    return {};
  }
}

function loadLocalEnv(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const content = readFileSync(filePath, "utf-8");
  const vars = {};

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      vars[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return vars;
}

async function main() {
  // Load existing local env files
  const envDev = loadLocalEnv(resolve(ROOT_DIR, ".env.dev"));
  const envLocal = loadLocalEnv(resolve(ROOT_DIR, ".env"));

  console.log(`📂 Loaded ${Object.keys(envDev).length} variables from .env.dev`);
  console.log(`📂 Loaded ${Object.keys(envLocal).length} variables from .env`);

  // Load from SSM
  const ssmParams = await loadFromSSM();

  // Merge: .env.dev < .env < SSM (but SSM only fills missing)
  const merged = { ...envDev, ...envLocal };

  // Map backend variables to frontend VITE_ variables
  const viteMapping = {
    AUTH0_DOMAIN: "VITE_AUTH0_DOMAIN",
    AUTH0_AUDIENCE: "VITE_AUTH0_AUDIENCE",
  };

  let addedCount = 0;
  const lines = ["# Auto-generated from AWS SSM - DO NOT EDIT MANUALLY\n"];

  // Add missing variables from SSM
  for (const [key, value] of Object.entries(ssmParams)) {
    if (!merged[key]) {
      merged[key] = value;
      lines.push(`${key}="${value}"`);
      addedCount++;
    }

    // Map backend vars to frontend VITE_ vars
    const viteKey = viteMapping[key];
    if (viteKey && !merged[viteKey]) {
      merged[viteKey] = value;
      lines.push(`${viteKey}="${value}"`);
      addedCount++;
    }
  }

  // Check for VITE_AUTH0_CLIENT_ID in apps/web/.env
  const webEnvPath = resolve(ROOT_DIR, "apps/web/.env");
  if (existsSync(webEnvPath)) {
    const webEnv = loadLocalEnv(webEnvPath);
    if (webEnv.VITE_AUTH0_CLIENT_ID && !merged.VITE_AUTH0_CLIENT_ID) {
      merged.VITE_AUTH0_CLIENT_ID = webEnv.VITE_AUTH0_CLIENT_ID;
      lines.push(`VITE_AUTH0_CLIENT_ID="${webEnv.VITE_AUTH0_CLIENT_ID}"`);
      addedCount++;
      console.log(`✓ Loaded VITE_AUTH0_CLIENT_ID from apps/web/.env`);
    }
  }

  if (addedCount > 0) {
    writeFileSync(ENV_SSM_PATH, lines.join("\n"));
    console.log(`✓ Wrote ${addedCount} variables to .env.local`);
  } else {
    console.log(`✓ All variables already defined locally`);
    // Create empty file so Vite doesn't error
    writeFileSync(ENV_SSM_PATH, "# No additional variables needed from SSM\n");
  }

  console.log(`✅ Environment setup complete\n`);
}

main().catch((error) => {
  console.error("❌ Failed to load environment:", error);
  process.exit(1);
});
