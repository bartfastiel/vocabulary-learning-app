// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, clickSubjectCard } from "./helpers.js";

/**
 * Set up a test profile with grade 1 and reload.
 */
async function freshStartGrade1(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => {
    const id = "pTest123";
    const profiles = [{
      id,
      name: "Tester",
      role: "student",
      points: 100,
      streakRecord: 0,
      avatarSelection: { background: 0, face: 0, hair: 0, eyes: 0, mouth: 0, glasses: 0, accessory: 0 },
      avatarUnlocked: [],
      avatarSvg: "",
      appBg: "dark",
      grade: "1",
    }];
    localStorage.setItem("allProfiles", JSON.stringify(profiles));
    localStorage.setItem("activeProfileId", id);
    localStorage.setItem("points", "100");
    localStorage.setItem("streakRecord", "0");
    localStorage.setItem("userRole", "student");
    localStorage.setItem("userGrade", "1");
    localStorage.setItem("appBg", "dark");
    localStorage.setItem("avatarSelection", JSON.stringify(profiles[0].avatarSelection));
    localStorage.setItem("avatarUnlocked", "[]");
    localStorage.setItem("vocabHelpSeen", "1");
  });
  await page.reload();
  await waitForAppShell(page);
}

test.describe("Grade 1 Detailed Tests", () => {

  // ── Verify localStorage grade is correctly set ──

  test("userGrade is set to 1 in localStorage", async ({ page }) => {
    await freshStartGrade1(page);
    const grade = await page.evaluate(() => localStorage.getItem("userGrade"));
    expect(grade).toBe("1");
  });

  // ── Englisch: vocab trainer loads lessons for grade 1 ──

  test("Englisch: vocab trainer loads grade 1 lessons and shows a question", async ({ page }) => {
    await freshStartGrade1(page);
    await clickSubjectCard(page, "Englisch");

    // Wait for vocab-trainer to appear
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    // Wait for lesson data to load (header should NOT be "–")
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      const header = trainer?.shadowRoot?.querySelector(".lesson-header");
      const text = header?.textContent?.trim() || "";
      return text.length > 0 && !text.includes("–");
    }, { timeout: 10000 });

    const lessonInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const sr = trainer.shadowRoot;
      const header = sr.querySelector(".lesson-header");
      return {
        headerText: header?.textContent?.trim() || "",
      };
    });

    // Header should show a grade 1 lesson name
    expect(lessonInfo.headerText).toContain("Kl. 1");
  });

  // ── Mathe: shows grade 1 categories and can generate questions ──

  test("Mathe: shows grade 1 categories (Zählen, Addition, Subtraktion, etc.)", async ({ page }) => {
    await freshStartGrade1(page);
    await clickSubjectCard(page, "Mathe");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("math-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    // Open category popup
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      trainer.shadowRoot.querySelector(".lesson-header").click();
    });
    await page.waitForTimeout(300);

    const categoryInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      const sr = trainer.shadowRoot;
      const catButtons = sr.querySelectorAll(".set-list button");
      return {
        categoryCount: catButtons.length,
        categoryNames: [...catButtons].map(b => b.textContent.trim()),
      };
    });

    expect(categoryInfo.categoryCount).toBeGreaterThanOrEqual(4);
    const allNames = categoryInfo.categoryNames.join(" ");
    expect(allNames).toMatch(/Addition/i);
    expect(allNames).toMatch(/Subtraktion/i);
  });

  test("Mathe: auto-selects first category and shows question with choices", async ({ page }) => {
    await freshStartGrade1(page);
    await clickSubjectCard(page, "Mathe");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("math-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    // Wait for choice buttons to appear (auto-selected category generates a question)
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("math-trainer");
      const choices = trainer?.shadowRoot?.querySelectorAll(".choice-btn");
      return choices && choices.length > 0;
    }, { timeout: 5000 });

    const questionInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("math-trainer");
      const sr = trainer.shadowRoot;
      return {
        questionText: sr.querySelector("#question-text")?.textContent?.trim() || "",
        choiceCount: sr.querySelectorAll(".choice-btn").length,
        headerText: sr.querySelector(".lesson-header .title")?.textContent?.trim() || "",
      };
    });

    expect(questionInfo.questionText.length).toBeGreaterThan(0);
    expect(questionInfo.choiceCount).toBeGreaterThanOrEqual(2);
    expect(questionInfo.headerText.length).toBeGreaterThan(0);
  });

  // ── Deutsch: shows grade 1 categories and can generate questions ──

  test("Deutsch: shows grade 1 categories (Buchstaben, Silben, Reimwörter, etc.)", async ({ page }) => {
    await freshStartGrade1(page);
    await clickSubjectCard(page, "Deutsch");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("deutsch-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    // Open category popup
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
      trainer.shadowRoot.querySelector(".lesson-header").click();
    });
    await page.waitForTimeout(300);

    const categoryInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
      const sr = trainer.shadowRoot;
      const catButtons = sr.querySelectorAll(".set-list button");
      return {
        categoryCount: catButtons.length,
        categoryNames: [...catButtons].map(b => b.textContent.trim()),
      };
    });

    expect(categoryInfo.categoryCount).toBeGreaterThanOrEqual(3);
    const allNames = categoryInfo.categoryNames.join(" ");
    expect(allNames).toMatch(/Buchstaben/i);
  });

  test("Deutsch: auto-selects first category and shows question with choices", async ({ page }) => {
    await freshStartGrade1(page);
    await clickSubjectCard(page, "Deutsch");
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("deutsch-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("deutsch-trainer");
      const choices = trainer?.shadowRoot?.querySelectorAll(".choice-btn");
      return choices && choices.length > 0;
    }, { timeout: 5000 });

    const questionInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("deutsch-trainer");
      const sr = trainer.shadowRoot;
      return {
        questionText: sr.querySelector("#question-text")?.textContent?.trim() || "",
        choiceCount: sr.querySelectorAll(".choice-btn").length,
        headerText: sr.querySelector(".lesson-header .title")?.textContent?.trim() || "",
      };
    });

    expect(questionInfo.questionText.length).toBeGreaterThan(0);
    expect(questionInfo.choiceCount).toBeGreaterThanOrEqual(2);
    expect(questionInfo.headerText.length).toBeGreaterThan(0);
  });

  // ── Biologie: vocab trainer loads bio lessons for grade 1 ──

  test("Biologie: loads grade 1 lessons", async ({ page }) => {
    await freshStartGrade1(page);

    const hasBio = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      const cards = sr.querySelectorAll(".subject-card");
      for (const card of cards) {
        if (card.textContent.includes("Biologie")) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (!hasBio) {
      test.skip();
      return;
    }

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    // Wait for data to load
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      const header = trainer?.shadowRoot?.querySelector(".lesson-header");
      const text = header?.textContent?.trim() || "";
      return text.length > 0 && !text.includes("–");
    }, { timeout: 10000 });

    const lessonInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const sr = trainer.shadowRoot;
      const header = sr.querySelector(".lesson-header");
      return {
        headerText: header?.textContent?.trim() || "",
        hasError: (sr.textContent || "").includes("Fehler"),
      };
    });

    expect(lessonInfo.hasError).toBe(false);
    expect(lessonInfo.headerText).toContain("Kl. 1");
  });

  // ── Geografie: vocab trainer loads geo lessons for grade 1 ──

  test("Geografie: loads grade 1 lessons", async ({ page }) => {
    await freshStartGrade1(page);

    const hasGeo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell.shadowRoot;
      const cards = sr.querySelectorAll(".subject-card");
      for (const card of cards) {
        if (card.textContent.includes("Geografie")) {
          card.click();
          return true;
        }
      }
      return false;
    });

    if (!hasGeo) {
      test.skip();
      return;
    }

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell?.shadowRoot?.querySelector("vocab-trainer");
      const header = trainer?.shadowRoot?.querySelector(".lesson-header");
      const text = header?.textContent?.trim() || "";
      return text.length > 0 && !text.includes("–");
    }, { timeout: 10000 });

    const lessonInfo = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const sr = trainer.shadowRoot;
      const header = sr.querySelector(".lesson-header");
      return {
        headerText: header?.textContent?.trim() || "",
        hasError: (sr.textContent || "").includes("Fehler"),
      };
    });

    expect(lessonInfo.hasError).toBe(false);
    expect(lessonInfo.headerText).toContain("Kl. 1");
  });
});
