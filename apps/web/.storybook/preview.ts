import type { Preview } from "@storybook/react";
import "@interviews-tracker/design-system/styles/tokens.css";
import "../src/styles.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    actions: { argTypesRegex: "^on[A-Z].*" },
  },
  tags: ["autodocs"],
};

export default preview;
