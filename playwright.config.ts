import { defineConfig, devices } from "@playwright/test";
import { loadRootEnv } from "./packages/adapters/src/load-env";

loadRootEnv();

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3201",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "node ./node_modules/tsx/dist/cli.mjs scripts/e2e-host.ts",
    url: "http://127.0.0.1:3201/login",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
