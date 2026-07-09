import tsParser from "@typescript-eslint/parser";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/.yarn/**",
      "**/*.min.js",
      "**/storybook-static/**",
      "**/.storybook/**",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": [
        "error",
        {
          groups: [
            // Side effect imports (e.g., import "./polyfills")
            ["^\\u0000"],
            // React and React-related packages first
            ["^react$", "^react-dom$", "^react-"],
            // Other external packages (including lucide-react, etc.)
            ["^@?\\w"],
            // @interviews-tracker packages
            ["^@interviews-tracker/"],
            // Parent imports (../) - both regular and type imports
            ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
            // Sibling imports (./) - both regular and type imports
            ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
            // Style imports
            ["^.+\\.s?css$"],
          ],
        },
      ],
      "simple-import-sort/exports": "error",
      "@typescript-eslint/consistent-type-imports": "off",
    },
  },
];
