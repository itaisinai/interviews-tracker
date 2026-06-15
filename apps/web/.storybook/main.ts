import type { StorybookConfig } from "@storybook/react-vite";
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: [
    "../../../packages/design-system/src/components/**/*.stories.@(ts|tsx)",
    "../src/components/**/*.stories.@(ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          "@interviews-tracker/design-system/styles/tokens.css": fileURLToPath(new URL("../../../packages/design-system/src/styles/tokens.css", import.meta.url)),
          "@interviews-tracker/design-system": fileURLToPath(new URL("../../../packages/design-system/src/index.ts", import.meta.url)),
        },
      },
    });
  },
};

export default config;
