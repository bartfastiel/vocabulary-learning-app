// @ts-check
import { test, expect } from "@playwright/test";
import { setupTestProfile, waitForAppShell, clickSubjectCard } from "./helpers.js";

/**
 * Set up a test profile with a specific grade and reload.
 */
async function freshStartWithGrade(page, grade) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((g) => {
    const id = "pTest123";
    const profiles = [{
      id,
      name: "Tester",
      role: "student",
      points: 0,
      streakRecord: 0,
      avatarSelection: { background: 0, face: 0, hair: 0, eyes: 0, mouth: 0, glasses: 0, accessory: 0 },
      avatarUnlocked: [],
      avatarSvg: "",
      appBg: "dark",
      grade: String(g),
    }];
    localStorage.setItem("allProfiles", JSON.stringify(profiles));
    localStorage.setItem("activeProfileId", id);
    localStorage.setItem("points", "0");
    localStorage.setItem("streakRecord", "0");
    localStorage.setItem("userRole", "student");
    localStorage.setItem("userGrade", String(g));
    localStorage.setItem("appBg", "dark");
    localStorage.setItem("avatarSelection", JSON.stringify(profiles[0].avatarSelection));
    localStorage.setItem("avatarUnlocked", "[]");
  }, grade);
  await page.reload();
  await waitForAppShell(page);
}

test.describe("Grade 1 & 2 Content", () => {

  // ── Vocab JSON has lessons for grade 1 and 2 ──

  for (const grade of [1, 2]) {
    test(`vocab.json has lessons for grade ${grade}`, async ({ page }) => {
      await page.goto("/");
      const count = await page.evaluate(async (g) => {
        const data = await fetch("vocab/vocab.json").then(r => r.json());
        return data.filter(lesson => lesson.grade === String(g)).length;
      }, grade);
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test(`vocab-bio.json has lessons for grade ${grade}`, async ({ page }) => {
      await page.goto("/");
      const count = await page.evaluate(async (g) => {
        const data = await fetch("vocab/vocab-bio.json").then(r => r.json());
        return data.filter(lesson => lesson.grade === String(g)).length;
      }, grade);
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test(`vocab-geo.json has lessons for grade ${grade}`, async ({ page }) => {
      await page.goto("/");
      const count = await page.evaluate(async (g) => {
        const data = await fetch("vocab/vocab-geo.json").then(r => r.json());
        return data.filter(lesson => lesson.grade === String(g)).length;
      }, grade);
      expect(count).toBeGreaterThanOrEqual(2);
    });
  }

  // ── Math trainer shows categories for grade 1 and 2 ──

  for (const grade of [1, 2]) {
    test(`math trainer has categories for grade ${grade}`, async ({ page }) => {
      await freshStartWithGrade(page, grade);
      await clickSubjectCard(page, "Mathe");
      await page.waitForFunction(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell?.shadowRoot?.querySelector("math-trainer");
        return trainer && trainer.shadowRoot;
      }, { timeout: 10000 });

      const buttonCount = await page.evaluate(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell.shadowRoot.querySelector("math-trainer");
        return trainer.shadowRoot.querySelectorAll("button").length;
      });
      expect(buttonCount).toBeGreaterThan(0);
    });
  }

  // ── Deutsch trainer shows categories for grade 1 and 2 ──

  for (const grade of [1, 2]) {
    test(`deutsch trainer has categories for grade ${grade}`, async ({ page }) => {
      await freshStartWithGrade(page, grade);
      await clickSubjectCard(page, "Deutsch");
      await page.waitForFunction(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell?.shadowRoot?.querySelector("deutsch-trainer");
        return trainer && trainer.shadowRoot;
      }, { timeout: 10000 });

      const buttonCount = await page.evaluate(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
        return trainer.shadowRoot.querySelectorAll("button").length;
      });
      expect(buttonCount).toBeGreaterThan(0);
    });
  }

  // ── Vocab trainer shows lessons when grade is 1 or 2 ──

  for (const grade of [1, 2]) {
    test(`vocab trainer shows lessons for grade ${grade}`, async ({ page }) => {
      await freshStartWithGrade(page, grade);
      await clickSubjectCard(page, "Englisch");
      await page.waitForFunction(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
        return trainer && trainer.shadowRoot;
      }, { timeout: 10000 });

      // Wait for lessons to load and check lesson header exists
      const hasLessonHeader = await page.evaluate(() => {
        const shell = document.querySelector("app-shell");
        const trainer = shell.shadowRoot.querySelector("vocab-trainer");
        const sr = trainer.shadowRoot;
        const header = sr.querySelector(".lesson-header");
        return header !== null && header.textContent.trim().length > 0;
      });
      expect(hasLessonHeader).toBe(true);
    });
  }
});
