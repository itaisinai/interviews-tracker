import { spawn } from "node:child_process";

const baseUrl = process.env.API_SMOKE_URL ?? "http://localhost:4000";
const child = spawn("node", ["scripts/start-api.mjs"], { stdio: "inherit", env: process.env });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  let lastError;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) process.exitCode = 0;
      else lastError = new Error(`Health check returned ${response.status}`);
      if (response.ok) break;
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }

  if (process.exitCode !== 0) {
    console.error(`API smoke check failed: ${lastError?.message ?? "unknown error"}`);
    process.exitCode = 1;
  }
} finally {
  child.kill("SIGTERM");
}
