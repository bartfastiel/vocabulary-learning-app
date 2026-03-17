import { describe, it, expect, beforeEach, vi } from "vitest";

// We need to set up a minimal DOM before importing PointsManager
function createMockRoot() {
  const container = document.createElement("div");
  container.innerHTML = `
    <span id="points">0</span>
    <span id="streak">0</span>
    <span id="streak-record">0</span>
    <div id="ship"></div>
    <div id="treasure"></div>
  `;
  return {
    getElementById(id) {
      return container.querySelector(`#${id}`);
    },
    _container: container,
  };
}

describe("PointsManager", () => {
  let PointsManager;
  let root;

  beforeEach(async () => {
    localStorage.clear();
    document.body.className = "";
    // Re-import fresh each time to avoid stale module state
    const mod = await import("../../vocab/points.js");
    PointsManager = mod.PointsManager;
    root = createMockRoot();
  });

  describe("constructor", () => {
    it("initializes with 0 points when localStorage is empty", () => {
      const pm = new PointsManager(root);
      expect(pm.points).toBe(0);
      expect(pm.streak).toBe(0);
      expect(pm.streakRecord).toBe(0);
    });

    it("reads existing points from localStorage", () => {
      localStorage.setItem("points", "42");
      localStorage.setItem("streakRecord", "7");
      const pm = new PointsManager(root);
      expect(pm.points).toBe(42);
      expect(pm.streakRecord).toBe(7);
    });

    it("sets points to Infinity for developer role", () => {
      localStorage.setItem("userRole", "developer");
      const pm = new PointsManager(root);
      expect(pm.points).toBe(Infinity);
      expect(root.getElementById("points").textContent).toBe("∞");
    });

    it("syncs streak record display on init", () => {
      localStorage.setItem("streakRecord", "15");
      const pm = new PointsManager(root);
      expect(root.getElementById("streak-record").textContent).toBe("15");
    });
  });

  describe("updatePoints", () => {
    it("adds points and updates display", () => {
      const pm = new PointsManager(root);
      pm.updatePoints(5);
      expect(pm.points).toBe(5);
      expect(root.getElementById("points").textContent).toBe("5");
      expect(localStorage.getItem("points")).toBe("5");
    });

    it("subtracts points", () => {
      localStorage.setItem("points", "10");
      const pm = new PointsManager(root);
      pm.updatePoints(-3);
      expect(pm.points).toBe(7);
    });

    it("enables treasure when points >= 1", () => {
      const pm = new PointsManager(root);
      pm.updatePoints(1);
      expect(root.getElementById("treasure").classList.contains("disabled")).toBe(false);
    });

    it("disables treasure when points < 1", () => {
      const pm = new PointsManager(root);
      pm.updatePoints(0);
      expect(root.getElementById("treasure").classList.contains("disabled")).toBe(true);
    });

    it("always shows ∞ for developer role", () => {
      localStorage.setItem("userRole", "developer");
      const pm = new PointsManager(root);
      pm.updatePoints(10);
      expect(pm.points).toBe(Infinity);
      expect(root.getElementById("points").textContent).toBe("∞");
    });
  });

  describe("updateStreak", () => {
    it("increments streak on correct answer", () => {
      const pm = new PointsManager(root);
      pm.updateStreak(true);
      expect(pm.streak).toBe(1);
      expect(root.getElementById("streak").textContent).toBe("1");
    });

    it("resets streak to 0 on wrong answer", () => {
      const pm = new PointsManager(root);
      pm.updateStreak(true);
      pm.updateStreak(true);
      pm.updateStreak(false);
      expect(pm.streak).toBe(0);
      expect(root.getElementById("streak").textContent).toBe("0");
    });

    it("updates streak record when beating previous best", () => {
      const pm = new PointsManager(root);
      pm.updateStreak(true);
      pm.updateStreak(true);
      pm.updateStreak(true);
      expect(pm.streakRecord).toBe(3);
      expect(localStorage.getItem("streakRecord")).toBe("3");
      expect(root.getElementById("streak-record").textContent).toBe("3");
    });

    it("does not lower streak record on wrong answer", () => {
      localStorage.setItem("streakRecord", "10");
      const pm = new PointsManager(root);
      pm.updateStreak(true);
      pm.updateStreak(false);
      expect(pm.streakRecord).toBe(10);
    });

    it("adds streak-10 class at 10 streak", () => {
      const pm = new PointsManager(root);
      for (let i = 0; i < 10; i++) pm.updateStreak(true);
      expect(document.body.classList.contains("streak-10")).toBe(true);
    });

    it("adds streak-15 class at 15 streak", () => {
      const pm = new PointsManager(root);
      for (let i = 0; i < 15; i++) pm.updateStreak(true);
      expect(document.body.classList.contains("streak-15")).toBe(true);
    });

    it("adds streak-20 class at 20 streak", () => {
      const pm = new PointsManager(root);
      for (let i = 0; i < 20; i++) pm.updateStreak(true);
      expect(document.body.classList.contains("streak-20")).toBe(true);
    });

    it("removes streak classes and adds streak-broken on wrong", () => {
      const pm = new PointsManager(root);
      for (let i = 0; i < 10; i++) pm.updateStreak(true);
      pm.updateStreak(false);
      expect(document.body.classList.contains("streak-10")).toBe(false);
      expect(document.body.classList.contains("streak-broken")).toBe(true);
    });
  });
});
