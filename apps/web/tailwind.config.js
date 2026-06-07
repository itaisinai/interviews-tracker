/** @type {import('tailwindcss').Config} */
export default {
  content: ["./apps/web/index.html", "./apps/web/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#f4f2ec",
        surface: "#f7f5ef",
        "surface-bright": "#faf8f3",
        "surface-dim": "#e7e1d6",
        "surface-container-lowest": "#fefdf8",
        "surface-container-low": "#f6f3eb",
        "surface-container": "#eee8dc",
        "surface-container-high": "#e3dfd4",
        "surface-container-highest": "#d9d4c8",
        "surface-variant": "#d7d0c1",
        outline: "#98a39b",
        "outline-variant": "#bcc7bb",
        line: "#d1d8d1",
        ink: "#10202b",
        "on-background": "#10202b",
        "on-surface": "#10202b",
        "on-surface-variant": "#4d5751",
        primary: "#006b45",
        "surface-tint": "#006b45",
        "on-primary": "#ffffff",
        "primary-container": "#ddeee5",
        "on-primary-container": "#143d31",
        "primary-fixed": "#d2e8d9",
        "primary-fixed-dim": "#9fd2b5",
        "on-primary-fixed": "#143d31",
        "on-primary-fixed-variant": "#2d624d",
        secondary: "#507563",
        "secondary-container": "#d5e7de",
        "on-secondary": "#ffffff",
        "on-secondary-container": "#1d4638",
        "secondary-fixed": "#dceae3",
        "secondary-fixed-dim": "#b4d1c3",
        "on-secondary-fixed": "#143a2f",
        "on-secondary-fixed-variant": "#355e51",
        tertiary: "#5f79b9",
        "tertiary-container": "#e0e8fb",
        "tertiary-fixed": "#ecf0fb",
        "tertiary-fixed-dim": "#cbd5ef",
        "on-tertiary": "#ffffff",
        "on-tertiary-container": "#304a87",
        "on-tertiary-fixed": "#20315d",
        "on-tertiary-fixed-variant": "#4b609d",
        error: "#c14943",
        "error-container": "#fde3e0",
        "on-error": "#ffffff",
        "on-error-container": "#7f271f",
        "inverse-surface": "#23313a",
        "inverse-on-surface": "#f4f1ea",
        "inverse-primary": "#7abf9e"
      },
      borderRadius: {
        lg: "0.45rem",
        xl: "0.65rem",
        "2xl": "0.9rem"
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
