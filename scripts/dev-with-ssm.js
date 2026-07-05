#!/usr/bin/env node

/**
 * Development server launcher with AWS SSM environment loading
 * Loads variables into memory and passes them to child processes
 */

import { spawn } from 'child_process';
import { SSMClient, GetParametersByPathCommand } from '@aws-sdk/client-ssm';
import { config as loadDotenv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

async function loadFromSSM() {
  try {
    const region = process.env.AWS_REGION || 'eu-central-1';
    const ssmPath = '/interviews-tracker/prod';

    console.log(`📡 Loading environment variables from AWS SSM...`);
    console.log(`   Path: ${ssmPath}`);
    console.log(`   Region: ${region}\n`);

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
          const varName = param.Name.split('/').pop();
          params[varName] = param.Value;
        }
      }

      nextToken = response.NextToken;
    } while (nextToken);

    console.log(`✓ Retrieved ${Object.keys(params).length} parameters from SSM\n`);
    return params;
  } catch (error) {
    console.warn('⚠️  Could not load from SSM:', error.message);
    console.warn('   Continuing without SSM parameters...\n');
    return {};
  }
}

async function main() {
  // Load local env files first
  const envDevPath = resolve(ROOT_DIR, '.env.dev');
  const envPath = resolve(ROOT_DIR, '.env');
  const webEnvPath = resolve(ROOT_DIR, 'apps/web/.env');

  console.log('🔧 Loading environment variables...\n');

  if (existsSync(envDevPath)) {
    loadDotenv({ path: envDevPath });
    console.log('✓ Loaded .env.dev');
  }

  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: true });
    console.log('✓ Loaded .env');
  }

  // Load from SSM
  const ssmParams = await loadFromSSM();

  // Merge environment variables (local .env.dev/.env overrides SSM)
  // Start with SSM params as base
  const mergedEnv = { ...ssmParams, ...process.env };
  let loadedCount = 0;

  // Count how many came from SSM (weren't in process.env before)
  for (const key of Object.keys(ssmParams)) {
    if (!process.env[key]) {
      loadedCount++;
    }
  }

  // Map backend vars to frontend VITE_ vars
  const viteMapping = {
    'AUTH0_DOMAIN': 'VITE_AUTH0_DOMAIN',
    'AUTH0_AUDIENCE': 'VITE_AUTH0_AUDIENCE',
  };

  for (const [backendKey, frontendKey] of Object.entries(viteMapping)) {
    if (mergedEnv[backendKey] && !mergedEnv[frontendKey]) {
      mergedEnv[frontendKey] = mergedEnv[backendKey];
      loadedCount++;
    }
  }

  // Load VITE_AUTH0_CLIENT_ID from apps/web/.env if exists
  if (existsSync(webEnvPath) && !mergedEnv.VITE_AUTH0_CLIENT_ID) {
    const webEnvContent = await import('fs').then(fs =>
      fs.promises.readFile(webEnvPath, 'utf-8')
    );
    const match = webEnvContent.match(/VITE_AUTH0_CLIENT_ID="?([^"\n]+)"?/);
    if (match) {
      mergedEnv.VITE_AUTH0_CLIENT_ID = match[1];
      console.log('✓ Loaded VITE_AUTH0_CLIENT_ID from apps/web/.env');
    }
  }

  console.log(`✓ Loaded ${loadedCount} additional variables from SSM\n`);
  console.log('🚀 Starting development servers...\n');

  // Start concurrently with merged environment
  const child = spawn('yarn', ['concurrently', '"yarn nx dev api"', '"yarn nx dev web"'], {
    env: mergedEnv,
    stdio: 'inherit',
    shell: true,
    cwd: ROOT_DIR,
  });

  // Forward signals
  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    child.kill('SIGTERM');
    process.exit(0);
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main().catch((error) => {
  console.error('❌ Failed to start:', error);
  process.exit(1);
});
