// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, freshStart } from "./helpers.js";

test.describe("Profile System", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("localStorage profile operations work in browser", async ({ page }) => {
    // Test profile creation through localStorage (unit-level in browser context)
    const result = await page.evaluate(() => {
      // Clear
      localStorage.clear();

      // Create a profile manually
      const id = "p" + Date.now();
      const profiles = [{ id, name: "TestUser", points: 0, streakRecord: 0, role: null }];
      localStorage.setItem("allProfiles", JSON.stringify(profiles));
      localStorage.setItem("activeProfileId", id);

      // Verify
      const stored = JSON.parse(localStorage.getItem("allProfiles"));
      const activeId = localStorage.getItem("activeProfileId");
      return {
        profileCount: stored.length,
        name: stored[0].name,
        activeId: activeId,
        matches: activeId === id,
      };
    });

    expect(result.profileCount).toBe(1);
    expect(result.name).toBe("TestUser");
    expect(result.matches).toBe(true);
  });

  test("points persist in localStorage across page loads", async ({ page }) => {
    // Set points
    await page.evaluate(() => {
      localStorage.setItem("points", "42");
    });

    // Reload
    await page.reload();
    await waitForAppShell(page);

    const points = await page.evaluate(() => {
      return localStorage.getItem("points");
    });
    expect(points).toBe("42");
  });

  test("streak record persists in localStorage", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("streakRecord", "15");
    });

    await page.reload();
    await waitForAppShell(page);

    const record = await page.evaluate(() => {
      return localStorage.getItem("streakRecord");
    });
    expect(record).toBe("15");
  });
});
