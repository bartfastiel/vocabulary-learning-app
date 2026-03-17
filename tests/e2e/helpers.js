// Shared helpers for E2E tests

/**
 * Set up a default test profile in localStorage so the app skips
 * the profile creation and role selection overlays.
 */
export async function setupTestProfile(page) {
  await page.evaluate(() => {
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
      grade: "5",
    }];
    localStorage.setItem("allProfiles", JSON.stringify(profiles));
    localStorage.setItem("activeProfileId", id);
    localStorage.setItem("points", "0");
    localStorage.setItem("streakRecord", "0");
    localStorage.setItem("userRole", "student");
    localStorage.setItem("userGrade", "5");
    localStorage.setItem("appBg", "dark");
    localStorage.setItem("avatarSelection", JSON.stringify(profiles[0].avatarSelection));
    localStorage.setItem("avatarUnlocked", "[]");
  });
}

/**
 * Wait for app-shell to be fully loaded and rendered (topbar visible).
 */
export async function waitForAppShell(page) {
  await page.waitForFunction(
    () => {
      const shell = document.querySelector("app-shell");
      return shell && shell.shadowRoot && shell.shadowRoot.querySelector(".topbar");
    },
    { timeout: 15000 }
  );
}

/**
 * Evaluate inside app-shell shadow root.
 */
export async function evalInShell(page, fn) {
  return page.evaluate((fnStr) => {
    const shell = document.querySelector("app-shell");
    const sr = shell?.shadowRoot;
    return new Function("sr", `return (${fnStr})(sr)`)(sr);
  }, fn.toString());
}

/**
 * Click a subject card by its label text.
 */
export async function clickSubjectCard(page, subjectText) {
  await page.evaluate((text) => {
    const shell = document.querySelector("app-shell");
    const sr = shell.shadowRoot;
    const cards = sr.querySelectorAll(".subject-card");
    for (const card of cards) {
      if (card.textContent.includes(text)) {
        card.click();
        return;
      }
    }
    throw new Error(`Subject card "${text}" not found`);
  }, subjectText);
}

/**
 * Click the back button to return to home.
 */
export async function clickBack(page) {
  await page.evaluate(() => {
    const shell = document.querySelector("app-shell");
    const sr = shell.shadowRoot;
    const btn = sr.querySelector(".back-btn");
    if (btn) btn.click();
  });
}

/**
 * Get the displayed points value from topbar.
 */
export async function getPoints(page) {
  return page.evaluate(() => {
    const shell = document.querySelector("app-shell");
    const sr = shell.shadowRoot;
    return sr.querySelector("#points")?.textContent || "0";
  });
}

/**
 * Set up a clean test with default profile and reload.
 */
export async function freshStart(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await setupTestProfile(page);
  await page.reload();
  await waitForAppShell(page);
}
