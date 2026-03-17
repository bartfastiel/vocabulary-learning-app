// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, freshStart } from "./helpers.js";

test.describe("Game Lobby", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("game lobby opens from Spiele action card", async ({ page }) => {
    // Click the Spiele action card
    const clicked = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      const actions = sr.querySelectorAll(".action-card");
      for (const card of actions) {
        if (card.textContent.includes("Spiele")) {
          card.click();
          return true;
        }
      }
      return false;
    });
    expect(clicked).toBe(true);

    // Wait for game-lobby to appear
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      return sr?.querySelector("game-lobby") !== null;
    }, { timeout: 5000 });

    const hasLobby = await evalInShell(page, (sr) => {
      return sr.querySelector("game-lobby") !== null;
    });
    expect(hasLobby).toBe(true);
  });

  test("game lobby shows list of games", async ({ page }) => {
    // Navigate to game lobby
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      const actions = sr.querySelectorAll(".action-card");
      for (const card of actions) {
        if (card.textContent.includes("Spiele")) {
          card.click();
          return;
        }
      }
    });

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const lobby = shell?.shadowRoot?.querySelector("game-lobby");
      return lobby && lobby.shadowRoot;
    }, { timeout: 5000 });

    const gameCount = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const lobby = shell.shadowRoot.querySelector("game-lobby");
      if (!lobby?.shadowRoot) return 0;
      const buttons = lobby.shadowRoot.querySelectorAll("button, .game-card, .game-item");
      return buttons.length;
    });
    expect(gameCount).toBeGreaterThan(0);
  });
});
