import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  snapshotPathTemplate: "./tests/visual/{testFileName}-snapshots/{arg}{ext}",
  use: {
    baseURL: process.env.STORYBOOK_URL ?? "http://127.0.0.1:6006",
    viewport: { width: 1440, height: 900 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",  
    deviceScaleFactor: 1,
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "UTC",
  },
});
