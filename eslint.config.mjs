import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/coverage/**",
      "playwright-report/**",
      "test-results/**",
      "var/**",
      // Next.js writes the triple-slash routes reference in this file.
      "**/next-env.d.ts",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-ignore": true, "ts-nocheck": true, "ts-expect-error": "allow-with-description" },
      ],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    files: ["packages/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Domain cannot import React." },
            { name: "react-dom", message: "Domain cannot import React." },
            { name: "next", message: "Domain cannot import Next.js." },
            { name: "pg", message: "Domain cannot import the Postgres driver." },
            { name: "hono", message: "Domain cannot import the HTTP framework." },
          ],
          patterns: [
            {
              group: ["next/*", "@draftline/postgres", "@draftline/adapters", "@draftline/composition", "@draftline/web", "@draftline/api"],
              message: "Domain stays free of frameworks and drivers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/**/*.ts", "apps/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@draftline/postgres", message: "Only the composition root constructs repositories." },
            {
              name: "@draftline/adapters",
              importNames: ["FakeModelGateway", "DiskObjectStorage", "scryptHasher", "createTokenIssuer", "systemClock"],
              message: "Only the composition root constructs adapters.",
            },
          ],
        },
      ],
    },
  },
);
