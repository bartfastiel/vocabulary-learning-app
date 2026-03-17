// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, clickSubjectCard, freshStart } from "./helpers.js";

test.describe("Deutsch Trainer", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
    await clickSubjectCard(page, "Deutsch");
    // Wait for deutsch-trainer to load
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("deutsch-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });
  });

  test("deutsch trainer renders", async ({ page }) => {
    const hasTrainer = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
      return trainer !== null && trainer.shadowRoot !== null;
    });
    expect(hasTrainer).toBe(true);
  });

  test("deutsch trainer shows categories or questions", async ({ page }) => {
    const hasContent = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
      const sr = trainer.shadowRoot;
      const buttons = sr.querySelectorAll("button");
      return buttons.length > 0;
    });
    expect(hasContent).toBe(true);
  });
});
