import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/styles/tokens.css"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
  // Copy CSS files automatically
  loader: {
    ".css": "copy",
  },
  publicDir: false,
});
