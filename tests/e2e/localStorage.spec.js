// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, freshStart } from "./helpers.js";

test.describe("LocalStorage Integration", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
  });

  test("spaced repetition data persists correctly", async ({ page }) => {
    await page.evaluate(() => {
      const data = { "hund|dog": 3, "katze|cat": 1 };
      localStorage.setItem("spacedRepetition", JSON.stringify(data));
    });

    const result = await page.evaluate(() => {
      const raw = localStorage.getItem("spacedRepetition");
      return JSON.parse(raw);
    });

    expect(result["hund|dog"]).toBe(3);
    expect(result["katze|cat"]).toBe(1);
  });

  test("custom vocab persists correctly", async ({ page }) => {
    await page.evaluate(() => {
      const custom = [{ name: "Test Lesson", words: [{ de: "Hund", en: "Dog", allowImage: false }] }];
      localStorage.setItem("customVocab", JSON.stringify(custom));
    });

    const result = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("customVocab"));
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Lesson");
    expect(result[0].words[0].de).toBe("Hund");
  });

  test("avatar selection persists correctly", async ({ page }) => {
    await page.evaluate(() => {
      const selection = { background: 0, face: 1, hair: 2, eyes: 3, mouth: 0, glasses: 0, accessory: 0 };
      localStorage.setItem("avatarSelection", JSON.stringify(selection));
    });

    await page.reload();
    await waitForAppShell(page);

    const result = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("avatarSelection"));
    });

    expect(result.face).toBe(1);
    expect(result.hair).toBe(2);
  });

  test("game highscores persist correctly", async ({ page }) => {
    await page.evaluate(() => {
      const scores = { asteroids: 150, memory: 200 };
      localStorage.setItem("gameHighscores", JSON.stringify(scores));
    });

    await page.reload();
    await waitForAppShell(page);

    const result = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("gameHighscores"));
    });
    expect(result.asteroids).toBe(150);
    expect(result.memory).toBe(200);
  });

  test("developer mode sets points to infinity symbol", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem("userRole", "developer");
    });

    await page.reload();
    await waitForAppShell(page);

    const pointsText = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      return shell.shadowRoot.querySelector("#points")?.textContent;
    });
    expect(pointsText).toBe("∞");
  });
});
