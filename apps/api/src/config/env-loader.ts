/**
 * Environment Variable Loader with Smart Fallbacks
 *
 * Loading strategy:
 * 1. Load .env.dev (dev defaults)
 * 2. Load .env (local overrides, gitignored)
 * 3. In production: Fall back to AWS Parameter Store for missing variables
 */

import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const ROOT_DIR = resolve(__dirname, '../../../..');

/**
 * Load environment variables from Parameter Store (production only)
 */
async function loadFromParameterStore(): Promise<Record<string, string>> {
  // Only in production and only if AWS SDK is available
  if (!IS_PRODUCTION) {
    return {};
  }

  try {
    // Dynamically import AWS SDK (only available on production server)
    const { SSMClient, GetParametersByPathCommand } = await import('@aws-sdk/client-ssm');

    const client = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
    const command = new GetParametersByPathCommand({
      Path: '/interviews-tracker/prod',
      WithDecryption: true,
      Recursive: true
    });

    const response = await client.send(command);
    const params: Record<string, string> = {};

    if (response.Parameters) {
      for (const param of response.Parameters) {
        if (param.Name && param.Value) {
          // Extract variable name from path: /interviews-tracker/prod/DATABASE_URL -> DATABASE_URL
          const varName = param.Name.split('/').pop()!;
          params[varName] = param.Value;
        }
      }
    }

    return params;
  } catch (error) {
    console.warn('Could not load from Parameter Store:', error instanceof Error ? error.message : error);
    return {};
  }
}

/**
 * Load environment variables with fallbacks
 */
export async function loadEnvironment(): Promise<void> {
  console.log('Loading environment variables...');

  // 1. Load .env.dev (development defaults)
  const envDevPath = resolve(ROOT_DIR, '.env.dev');
  if (existsSync(envDevPath)) {
    loadDotenv({ path: envDevPath });
    console.log('✓ Loaded .env.dev');
  }

  // 2. Load .env (local overrides)
  const envPath = resolve(ROOT_DIR, '.env');
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: true });
    console.log('✓ Loaded .env (local overrides)');
  }

  // 3. In production: Load from Parameter Store for missing variables
  if (IS_PRODUCTION) {
    console.log('Production mode: checking AWS Parameter Store for missing variables...');
    const ssmParams = await loadFromParameterStore();

    let loadedCount = 0;
    for (const [key, value] of Object.entries(ssmParams)) {
      // Only set if not already defined
      if (!process.env[key]) {
        process.env[key] = value;
        loadedCount++;
      }
    }

    if (loadedCount > 0) {
      console.log(`✓ Loaded ${loadedCount} variables from Parameter Store`);
    }
  }

  console.log('Environment loading complete');
}

/**
 * Get required environment variables with clear errors
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}\n` +
      `\nIn development: Add to .env.dev or .env` +
      `\nIn production: Add to AWS Parameter Store at /interviews-tracker/prod/${name}`
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
