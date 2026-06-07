import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: appRoot,
  envDir: repoRoot,
  server: {
    port: 5173
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true
  }
});
