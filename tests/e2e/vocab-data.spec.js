// @ts-check
import { test, expect } from "@playwright/test";
import { freshStart } from "./helpers.js";

test.describe("Vocab Data Integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("vocab.json is valid JSON and has correct structure", async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const resp = await fetch("vocab/vocab.json");
        if (!resp.ok) return { error: `HTTP ${resp.status}` };
        const data = await resp.json();
        if (!Array.isArray(data)) return { error: "Not an array" };
        if (data.length === 0) return { error: "Empty array" };

        const issues = [];
        for (let i = 0; i < data.length; i++) {
          const lesson = data[i];
          if (!lesson.name) issues.push(`Lesson ${i}: missing name`);
          if (!Array.isArray(lesson.words)) {
            issues.push(`Lesson ${i}: missing words array`);
            continue;
          }
          for (let j = 0; j < lesson.words.length; j++) {
            const w = lesson.words[j];
            if (!w.de) issues.push(`Lesson ${i}, word ${j}: missing 'de'`);
            if (!w.en) issues.push(`Lesson ${i}, word ${j}: missing 'en'`);
          }
        }
        return { lessonCount: data.length, wordCount: data.reduce((s, l) => s + l.words.length, 0), issues };
      } catch (e) {
        return { error: e.message };
      }
    });

    expect(result.error).toBeUndefined();
    expect(result.lessonCount).toBeGreaterThan(0);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.issues).toEqual([]);
  });

  test("each word has allowImage as boolean", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const data = await fetch("vocab/vocab.json").then((r) => r.json());
      const issues = [];
      for (const lesson of data) {
        for (const w of lesson.words) {
          if (typeof w.allowImage !== "boolean") {
            issues.push(`${w.de}/${w.en}: allowImage is ${typeof w.allowImage}`);
          }
        }
      }
      return issues;
    });
    expect(result).toEqual([]);
  });

  test("no duplicate words within a lesson", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const data = await fetch("vocab/vocab.json").then((r) => r.json());
      const issues = [];
      for (const lesson of data) {
        const seen = new Set();
        for (const w of lesson.words) {
          const key = `${w.de}|${w.en}`;
          if (seen.has(key)) issues.push(`Duplicate in "${lesson.name}": ${key}`);
          seen.add(key);
        }
      }
      return issues;
    });
    expect(result).toEqual([]);
  });
});
