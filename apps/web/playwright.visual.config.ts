import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  use: {
    baseURL: process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006",
    viewport: { width: 1280, height: 960 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
