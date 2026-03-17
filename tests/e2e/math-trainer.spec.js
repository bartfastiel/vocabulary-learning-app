// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, clickSubjectCard, freshStart } from "./helpers.js";

test.describe("Math Trainer", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
    await clickSubjectCard(page, "Mathe");
    // Wait for math-trainer to load
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("math-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });
  });

  test("math trainer renders", async ({ page }) => {
    const hasTrainer = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      return trainer !== null && trainer.shadowRoot !== null;
    });
    expect(hasTrainer).toBe(true);
  });

  test("math trainer shows a question or category selection", async ({ page }) => {
    const hasContent = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      const sr = trainer.shadowRoot;
      // Check for question text, buttons, or category selection
      const buttons = sr.querySelectorAll("button");
      const text = sr.textContent.trim();
      return buttons.length > 0 || text.length > 0;
    });
    expect(hasContent).toBe(true);
  });

  test("math trainer has interactive elements", async ({ page }) => {
    const buttonCount = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      return trainer.shadowRoot.querySelectorAll("button").length;
    });
    expect(buttonCount).toBeGreaterThan(0);
  });
});
