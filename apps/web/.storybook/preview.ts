import type { Preview } from "@storybook/react";

import "@interviews-tracker/design-system/styles/tokens.css";
import "../src/styles.css";

if (typeof document !== "undefined") {
  const head = document.head;
  const ensureLink = (rel: string, href: string, crossOrigin?: string) => {
    if (head.querySelector(`link[href="${href}"]`)) {
      return;
    }

    const link = document.createElement("link");
    link.rel = rel;
    link.href = href;
    if (crossOrigin) {
      link.crossOrigin = crossOrigin;
    }
    head.appendChild(link);
  };

  ensureLink("preconnect", "https://fonts.googleapis.com");
  ensureLink("preconnect", "https://fonts.gstatic.com", "anonymous");
  ensureLink(
    "stylesheet",
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Geist:wght@400;500;600&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
  );
}

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    actions: { argTypesRegex: "^on[A-Z].*" },
  },
  tags: ["autodocs"],
};

export default preview;
