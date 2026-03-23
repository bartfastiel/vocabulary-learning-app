// @ts-check
import { test, expect } from "@playwright/test";

test.describe("App Loading", () => {
  test("index.html loads without errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    // Wait for app-shell to be defined and rendered
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      return shell && shell.shadowRoot;
    }, { timeout: 10000 });

    expect(errors).toEqual([]);
  });

  test("app-shell custom element is present", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      return shell && shell.shadowRoot;
    }, { timeout: 10000 });

    const shellExists = await page.evaluate(() => {
      return document.querySelector("app-shell") !== null;
    });
    expect(shellExists).toBe(true);
  });

  test("app-shell has shadow DOM", async ({ page }) => {
    await page.goto("/");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      return shell && shell.shadowRoot;
    }, { timeout: 10000 });

    const hasShadow = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      return shell?.shadowRoot !== null;
    });
    expect(hasShadow).toBe(true);
  });

  test("no console errors during load", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      return shell && shell.shadowRoot;
    }, { timeout: 10000 });

    // Allow network errors for optional assets (audio, images) but not JS errors
    const jsErrors = consoleErrors.filter(
      (e) => !e.includes("404") && !e.includes("net::ERR")
    );
    expect(jsErrors).toEqual([]);
  });

  test("page title is Vokabeltrainer + Raketen-Spiel", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Vokabeltrainer + Raketen-Spiel");
  });
});
