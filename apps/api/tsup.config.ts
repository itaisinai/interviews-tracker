import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  clean: true,
  sourcemap: true,
  treeshake: true,
  outDir: "../../dist/api",
  // Don't bundle node_modules - they're available in production
  noExternal: [],
  // Bundle everything except these
  external: [
    "@prisma/client",
    "@sentry/node",
    "@sentry/profiling-node",
    "dotenv",
    "express",
    "cors",
    "jose",
    "zod",
  ],
});
