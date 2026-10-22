const mapper = {
  "^@draftline/domain$": "<rootDir>/packages/domain/src/index.ts",
  "^@draftline/contracts$": "<rootDir>/packages/contracts/src/index.ts",
  "^@draftline/adapters$": "<rootDir>/packages/adapters/src/index.ts",
  "^@draftline/postgres$": "<rootDir>/packages/postgres/src/index.ts",
  "^@draftline/composition$": "<rootDir>/packages/composition/src/compose.ts",
};

const transform = {
  "^.+\\.tsx?$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.jest.json" }],
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: "unit",
      testEnvironment: "node",
      testMatch: [
        "<rootDir>/packages/**/*.test.ts",
        "<rootDir>/apps/api/**/*.test.ts",
        "<rootDir>/apps/worker/**/*.test.ts",
      ],
      moduleNameMapper: mapper,
      transform,
    },
    {
      displayName: "web",
      testEnvironment: "jsdom",
      testMatch: ["<rootDir>/apps/web/**/*.test.ts", "<rootDir>/apps/web/**/*.test.tsx"],
      setupFiles: ["<rootDir>/apps/web/jest.polyfill.cjs"],
      setupFilesAfterEnv: ["<rootDir>/apps/web/jest.setup.ts"],
      moduleNameMapper: mapper,
      transform,
    },
    {
      displayName: "integration",
      testEnvironment: "node",
      testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
      setupFiles: ["<rootDir>/tests/integration/env.ts"],
      moduleNameMapper: mapper,
      transform,
      maxWorkers: 1,
    },
  ],
};
