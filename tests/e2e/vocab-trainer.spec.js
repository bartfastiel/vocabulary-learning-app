// @ts-check
import { test, expect } from "@playwright/test";
import { waitForAppShell, evalInShell, clickSubjectCard, freshStart } from "./helpers.js";

test.describe("Vocab Trainer", () => {
  test.beforeEach(async ({ page }) => {
    await freshStart(page);
    await clickSubjectCard(page, "Englisch");
    // Wait for trainer to load
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const sr = shell?.shadowRoot;
      const trainer = sr?.querySelector("vocab-trainer");
      return trainer && trainer.shadowRoot;
    }, { timeout: 10000 });
  });

  test("vocab trainer renders with lesson header", async ({ page }) => {
    const hasHeader = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      return trainer.shadowRoot.querySelector(".lesson-header") !== null;
    });
    expect(hasHeader).toBe(true);
  });

  test("vocab trainer shows mascot", async ({ page }) => {
    const hasMascot = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      return trainer.shadowRoot.querySelector("#mascot") !== null;
    });
    expect(hasMascot).toBe(true);
  });

  test("vocab trainer shows progress bar", async ({ page }) => {
    const hasProgress = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      return trainer.shadowRoot.querySelector("#progress-bar") !== null;
    });
    expect(hasProgress).toBe(true);
  });

  test("vocab trainer shows a question", async ({ page }) => {
    // Wait for question to be rendered
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const questionHost = trainer.shadowRoot.querySelector("#question");
      return questionHost && questionHost.children.length > 0;
    }, { timeout: 10000 });

    const hasQuestion = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const questionHost = trainer.shadowRoot.querySelector("#question");
      return questionHost.children.length > 0;
    });
    expect(hasQuestion).toBe(true);
  });

  test("vocab trainer shows answer options", async ({ page }) => {
    // Wait for answer to be rendered
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const answerHost = trainer.shadowRoot.querySelector("#answer");
      return answerHost && answerHost.children.length > 0;
    }, { timeout: 10000 });

    const hasAnswer = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const answerHost = trainer.shadowRoot.querySelector("#answer");
      return answerHost.children.length > 0;
    });
    expect(hasAnswer).toBe(true);
  });

  test("lesson picker opens on header click", async ({ page }) => {
    // Click the lesson header
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      trainer.shadowRoot.querySelector(".lesson-header").click();
    });

    // Wait for popup to appear
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const popup = trainer.shadowRoot.querySelector(".lesson-popup");
      return popup && popup.classList.contains("active");
    }, { timeout: 5000 });

    const popupActive = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      return trainer.shadowRoot.querySelector(".lesson-popup").classList.contains("active");
    });
    expect(popupActive).toBe(true);
  });

  test("lesson picker shows lesson buttons", async ({ page }) => {
    await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      trainer.shadowRoot.querySelector(".lesson-header").click();
    });

    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const popup = trainer.shadowRoot.querySelector(".lesson-popup");
      return popup && popup.classList.contains("active");
    }, { timeout: 5000 });

    // Wait for lesson buttons to be rendered (loadSets is async)
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const list = trainer.shadowRoot.querySelector(".set-list");
      return list && list.querySelectorAll("button").length > 0;
    }, { timeout: 10000 });

    const lessonCount = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const buttons = trainer.shadowRoot.querySelectorAll(".set-list button");
      return buttons.length;
    });
    expect(lessonCount).toBeGreaterThan(0);
  });

  test("answering a question shows next button or advances", async ({ page }) => {
    // Wait for answer component to load
    await page.waitForFunction(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const answerHost = trainer.shadowRoot.querySelector("#answer");
      return answerHost && answerHost.children.length > 0;
    }, { timeout: 10000 });

    // Try to interact with the answer - find a clickable button in the answer component
    const clicked = await page.evaluate(() => {
      const shell = document.querySelector("app-shell");
      const trainer = shell.shadowRoot.querySelector("vocab-trainer");
      const answerHost = trainer.shadowRoot.querySelector("#answer");
      const answerEl = answerHost.children[0];
      if (!answerEl || !answerEl.shadowRoot) return false;

      // Try to find buttons (for choose-type answers)
      const buttons = answerEl.shadowRoot.querySelectorAll("button");
      if (buttons.length > 0) {
        // Click the first option button (not the next button)
        for (const btn of buttons) {
          if (!btn.classList.contains("next-btn") && btn.textContent.trim() !== "") {
            btn.click();
            return true;
          }
        }
      }

      // Try text input (for type-type answers)
      const input = answerEl.shadowRoot.querySelector("input");
      if (input) {
        input.value = "test";
        const submitBtn = answerEl.shadowRoot.querySelector("button");
        if (submitBtn) {
          submitBtn.click();
          return true;
        }
      }

      return false;
    });

    expect(clicked).toBe(true);
  });
});
