/** @type {import('tailwindcss').Config} */
export default {
  content: ["./apps/web/index.html", "./apps/web/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-container-high": "#dce9ff",
        "on-background": "#0b1c30",
        "on-error-container": "#93000a",
        "surface-variant": "#d3e4fe",
        outline: "#6c7a71",
        "surface-tint": "#006c49",
        "on-error": "#ffffff",
        "inverse-on-surface": "#eaf1ff",
        "primary-fixed-dim": "#4edea3",
        "on-surface": "#0b1c30",
        "on-secondary-container": "#fefcff",
        "surface-dim": "#cbdbf5",
        "surface-container-lowest": "#ffffff",
        "secondary-container": "#2170e4",
        "on-tertiary-fixed": "#23005c",
        error: "#ba1a1a",
        "on-surface-variant": "#3c4a42",
        "on-tertiary-container": "#4600a7",
        "primary-container": "#10b981",
        "on-tertiary-fixed-variant": "#5516be",
        "tertiary-fixed": "#e9ddff",
        primary: "#006c49",
        secondary: "#0058be",
        "secondary-fixed-dim": "#adc6ff",
        "on-primary-fixed-variant": "#005236",
        "inverse-surface": "#213145",
        "outline-variant": "#bbcabf",
        "surface-container-low": "#eff4ff",
        "on-secondary-fixed": "#001a42",
        "tertiary-container": "#b090ff",
        "surface-bright": "#f8f9ff",
        "surface-container-highest": "#d3e4fe",
        "tertiary-fixed-dim": "#d0bcff",
        "on-tertiary": "#ffffff",
        "on-primary-container": "#00422b",
        surface: "#f8f9ff",
        tertiary: "#6d3bd7",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "error-container": "#ffdad6",
        "inverse-primary": "#4edea3",
        "secondary-fixed": "#d8e2ff",
        background: "#f8f9ff",
        "primary-fixed": "#6ffbbe",
        "on-secondary-fixed-variant": "#004395",
        "surface-container": "#e5eeff",
        "on-primary-fixed": "#002113",
        ink: "#0b1c30",
        line: "#bbcabf"
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem"
      },
      spacing: {
        "sidebar-width": "260px",
        gutter: "1.5rem",
        "max-content-width": "1280px"
      },
      fontFamily: {
        inter: ["Inter", "ui-sans-serif", "system-ui"],
        geist: ["Geist", "ui-sans-serif", "system-ui"],
        "body-md": ["Inter"],
        "body-lg": ["Inter"],
        "headline-lg": ["Inter"],
        "headline-md": ["Inter"],
        "title-md": ["Inter"],
        "label-md": ["Geist"],
        "label-sm": ["Geist"]
      },
      fontSize: {
        "body-md": ["14px", { lineHeight: "20px", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "headline-lg": ["32px", { lineHeight: "40px", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "title-md": ["18px", { lineHeight: "28px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.02em", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "14px", letterSpacing: "0.05em", fontWeight: "600" }]
      }
    }
  },
  plugins: []
};
