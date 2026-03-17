// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, freshStart } from "./helpers.js";

test.describe("Avatar Builder", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("avatar builder opens from action card", async ({ page }) => {
    // Click the Avatar action card
    const clicked = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      // Try action cards first, then topbar avatar
      const actions = sr.querySelectorAll(".action-card");
      for (const card of actions) {
        if (card.textContent.includes("Avatar")) {
          card.click();
          return true;
        }
      }
      // Try clicking topbar avatar
      const avatar = sr.querySelector(".topbar-avatar");
      if (avatar) {
        avatar.click();
        return true;
      }
      return false;
    });
    expect(clicked).toBe(true);

    // Wait for avatar-builder to appear
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const builder = sr?.querySelector("avatar-builder");
      return builder && builder.shadowRoot;
    }, { timeout: 5000 });

    const hasBuilder = await evalInShell(page, (sr) => {
      return sr.querySelector("avatar-builder") !== null;
    });
    expect(hasBuilder).toBe(true);
  });

  test("avatar builder has layer controls", async ({ page }) => {
    // Open avatar builder
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      const actions = sr.querySelectorAll(".action-card");
      for (const card of actions) {
        if (card.textContent.includes("Avatar")) {
          card.click();
          return;
        }
      }
      const avatar = sr.querySelector(".topbar-avatar");
      if (avatar) avatar.click();
    });

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const builder = shell?.shadowRoot?.querySelector("avatar-builder");
      return builder && builder.shadowRoot;
    }, { timeout: 5000 });

    const hasControls = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const builder = shell.shadowRoot.querySelector("avatar-builder");
      if (!builder?.shadowRoot) return false;
      // Check for navigation/control buttons
      const buttons = builder.shadowRoot.querySelectorAll("button");
      return buttons.length > 0;
    });
    expect(hasControls).toBe(true);
  });
});
