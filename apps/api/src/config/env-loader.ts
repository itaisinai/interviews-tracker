/**
 * Environment Variable Loader with Smart Fallbacks
 *
 * Loading strategy:
 * 1. Load .env.dev (dev defaults)
 * 2. Load .env (local overrides, gitignored)
 * 3. Fall back to AWS Parameter Store (SSM) for missing variables
 *    - Always loads from /interviews-tracker/prod (shared across environments)
 */

import { config as loadDotenv } from "dotenv";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const ROOT_DIR = resolve(__dirname, "../../../..");

/**
 * Load environment variables from Parameter Store
 * Always loads from prod path for both development and production environments
 */
async function loadFromParameterStore(): Promise<Record<string, string>> {
  try {
    const { SSMClient, GetParametersByPathCommand } = await import("@aws-sdk/client-ssm");

    const region = process.env.AWS_REGION || "eu-central-1";
    const ssmPath = "/interviews-tracker/prod";

    console.log(`Attempting to load from AWS SSM (path: ${ssmPath}, region: ${region})...`);

    const client = new SSMClient({ region });
    const params: Record<string, string> = {};

    let nextToken: string | undefined;

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
          const varName = param.Name.split("/").pop()!;
          params[varName] = param.Value;
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    console.log(`✓ Retrieved ${Object.keys(params).length} parameters from SSM`);
    return params;
  } catch (error) {
    console.warn("⚠️  Could not load from Parameter Store:", error instanceof Error ? error.message : error);
    console.warn("   Continuing with local environment variables only...");
    return {};
  }
}

/**
 * Load environment variables with fallbacks
 */
export async function loadEnvironment(): Promise<void> {
  console.log("Loading environment variables...");
  console.log(`Environment: ${IS_PRODUCTION ? "production" : "development"}`);

  // 1. Load .env.dev (development defaults)
  const envDevPath = resolve(ROOT_DIR, ".env.dev");
  if (existsSync(envDevPath)) {
    loadDotenv({ path: envDevPath });
    console.log("✓ Loaded .env.dev");
  }

  // 2. Load .env (local overrides)
  const envPath = resolve(ROOT_DIR, ".env");
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: true });
    console.log("✓ Loaded .env (local overrides)");
  }

  // 3. Load from Parameter Store for missing variables (both dev and prod)
  console.log("Checking AWS Parameter Store for missing variables...");
  const ssmParams = await loadFromParameterStore();

  if (Object.keys(ssmParams).length > 0) {
    let loadedCount = 0;
    let skippedCount = 0;

    for (const [key, value] of Object.entries(ssmParams)) {
      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = value;
        loadedCount++;
        console.log(`  ✓ Loaded ${key} from SSM`);
      } else {
        skippedCount++;
      }
    }

    if (loadedCount > 0) {
      console.log(`✓ Loaded ${loadedCount} variable(s) from Parameter Store`);
    }
    if (skippedCount > 0) {
      console.log(`  ℹ️  Skipped ${skippedCount} variable(s) already defined locally`);
    }
  }

  console.log("Environment loading complete");
}

/**
 * Get required environment variables with clear errors
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
        `\nLocal files: Add to .env.dev or .env` +
        `\nAWS SSM: Add to Parameter Store at /interviews-tracker/prod/${name}`
    );
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Check if variable is defined
 */
export function hasEnv(name: string): boolean {
  return !!process.env[name];
}
