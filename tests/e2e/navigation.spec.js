// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, clickSubjectCard, clickBack, freshStart } from "./helpers.js";

test.describe("Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("clicking Englisch card shows vocab trainer", async ({ page }) => {
    await clickSubjectCard(page, "Englisch");

    // Wait for trainer screen to become visible
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const trainerScreen = sr?.querySelector("#trainer-screen");
      return trainerScreen && trainerScreen.style.display !== "none";
    }, { timeout: 5000 });

    const trainerVisible = await evalInShell(page, (sr) => {
      const ts = sr.querySelector("#trainer-screen");
      return ts && ts.style.display !== "none";
    });
    expect(trainerVisible).toBe(true);
  });

  test("clicking Mathe card shows math trainer", async ({ page }) => {
    await clickSubjectCard(page, "Mathe");

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const trainerScreen = sr?.querySelector("#trainer-screen");
      return trainerScreen && trainerScreen.style.display !== "none";
    }, { timeout: 5000 });

    const hasTrainer = await evalInShell(page, (sr) => {
      return sr.querySelector("math-trainer") !== null;
    });
    expect(hasTrainer).toBe(true);
  });

  test("clicking Deutsch card shows deutsch trainer", async ({ page }) => {
    await clickSubjectCard(page, "Deutsch");

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const trainerScreen = sr?.querySelector("#trainer-screen");
      return trainerScreen && trainerScreen.style.display !== "none";
    }, { timeout: 5000 });

    const hasTrainer = await evalInShell(page, (sr) => {
      return sr.querySelector("deutsch-trainer") !== null;
    });
    expect(hasTrainer).toBe(true);
  });

  test("back button returns to home screen", async ({ page }) => {
    await clickSubjectCard(page, "Englisch");

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const trainerScreen = sr?.querySelector("#trainer-screen");
      return trainerScreen && trainerScreen.style.display !== "none";
    }, { timeout: 5000 });

    // Click back and wait for home screen — retry click if needed
    const homeVisible = await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const btn = sr?.querySelector(".back-btn");
      if (btn) btn.click();
      const home = sr?.querySelector("#home-screen");
      return home && home.style.display !== "none" && getComputedStyle(home).display !== "none";
    }, { timeout: 10000 });
    expect(homeVisible).toBeTruthy();
  });
});
