// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, freshStart } from "./helpers.js";

test.describe("Dashboard / Home Screen", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("shows topbar with points and streak", async ({ page }) => {
    const hasTopbar = await evalInShell(page, (sr) => {
      return sr.querySelector(".topbar") !== null;
    });
    expect(hasTopbar).toBe(true);

    const hasPoints = await evalInShell(page, (sr) => {
      return sr.querySelector("#points") !== null;
    });
    expect(hasPoints).toBe(true);
  });

  test("shows subject cards (Englisch, Mathe, Deutsch)", async ({ page }) => {
    const cardTexts = await evalInShell(page, (sr) => {
      const cards = sr.querySelectorAll(".subject-card");
      return Array.from(cards).map((c) => c.textContent.trim());
    });

    // Should have at least the three main subjects
    const hasEnglisch = cardTexts.some((t) => t.includes("Englisch"));
    const hasMathe = cardTexts.some((t) => t.includes("Mathe"));
    const hasDeutsch = cardTexts.some((t) => t.includes("Deutsch"));

    expect(hasEnglisch).toBe(true);
    expect(hasMathe).toBe(true);
    expect(hasDeutsch).toBe(true);
  });

  test("shows action buttons (Spiele, Avatar, etc.)", async ({ page }) => {
    const hasActions = await evalInShell(page, (sr) => {
      const actions = sr.querySelectorAll(".action-card, .home-actions button");
      return actions.length > 0;
    });
    expect(hasActions).toBe(true);
  });

  test("shows stats banner with points, streak, record", async ({ page }) => {
    const hasStats = await evalInShell(page, (sr) => {
      const stats = sr.querySelectorAll(".stat-box");
      return stats.length >= 2;
    });
    expect(hasStats).toBe(true);
  });

  test("points display starts at 0 for new user", async ({ page }) => {
    const points = await evalInShell(page, (sr) => {
      return sr.querySelector("#points")?.textContent;
    });
    expect(points).toBe("0");
  });
});
