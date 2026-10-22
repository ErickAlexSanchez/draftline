import { expect, test } from "@playwright/test";
import { loadRootEnv } from "../../packages/adapters/src/load-env";

loadRootEnv();

test("an editor sees a job move from queued to succeeded", async ({ page }) => {
  const email = process.env.SEED_EDITOR_EMAIL ?? "editor@draftline.example";
  const password = process.env.SEED_EDITOR_PASSWORD;
  if (!password) throw new Error("SEED_EDITOR_PASSWORD is required");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();

  await page.getByRole("link", { name: "New job" }).click();
  const title = `Harbor note ${Date.now()}`;
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Brief").fill("Write a short welcome for the harbor newsletter.");
  await page.getByRole("button", { name: "Enqueue draft" }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("Queued");
  await expect(page.getByRole("status")).toHaveText("Succeeded", { timeout: 20_000 });
  await expect(page.getByRole("article")).toContainText("Review it before you share it.");
});
