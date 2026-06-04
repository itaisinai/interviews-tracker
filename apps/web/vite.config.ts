import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: appRoot,
  server: {
    port: 5173
  },
  build: {
    outDir: "../../dist/web",
    emptyOutDir: true
  }
});
