import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: appRoot,
  envDir: repoRoot,
  resolve: {
    alias: {
      "@interviews-tracker/design-system/styles/tokens.css": fileURLToPath(
        new URL("../../packages/design-system/src/styles/tokens.css", import.meta.url)
      ),
      "@interviews-tracker/design-system": fileURLToPath(
        new URL("../../packages/design-system/src/index.ts", import.meta.url)
      ),
      "@interviews-tracker/core": fileURLToPath(new URL("../../packages/core/src/index.ts", import.meta.url)),
      "@interviews-tracker/ai": fileURLToPath(new URL("../../packages/ai/src/index.ts", import.meta.url)),
      "@interviews-tracker/integrations": fileURLToPath(
        new URL("../../packages/integrations/src/index.ts", import.meta.url)
      ),
      "@interviews-tracker/api-client": fileURLToPath(
        new URL("../../packages/api-client/src/index.ts", import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [repoRoot],
    },
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true,
  },
});
