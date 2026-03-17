import { describe, it, expect, beforeEach } from "vitest";
import {
  getProfiles,
  getActiveId,
  getActiveProfile,
  createProfile,
  deleteProfile,
  saveSnapshot,
  activateProfile,
  setAvatarSvg,
} from "../../core/profiles.js";

describe("profiles", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getProfiles", () => {
    it("returns empty array when no profiles exist", () => {
      expect(getProfiles()).toEqual([]);
    });

    it("returns saved profiles", () => {
      localStorage.setItem("allProfiles", JSON.stringify([{ id: "p1", name: "Test" }]));
      expect(getProfiles()).toEqual([{ id: "p1", name: "Test" }]);
    });

    it("returns empty array on corrupt JSON", () => {
      localStorage.setItem("allProfiles", "not-json");
      expect(getProfiles()).toEqual([]);
    });
  });

  describe("getActiveId", () => {
    it("returns null when no active profile", () => {
      expect(getActiveId()).toBe(null);
    });

    it("returns active profile id", () => {
      localStorage.setItem("activeProfileId", "p123");
      expect(getActiveId()).toBe("p123");
    });
  });

  describe("getActiveProfile", () => {
    it("returns null when no active profile", () => {
      expect(getActiveProfile()).toBe(null);
    });

    it("returns null when active id does not match any profile", () => {
      localStorage.setItem("activeProfileId", "p999");
      localStorage.setItem("allProfiles", JSON.stringify([{ id: "p1", name: "A" }]));
      expect(getActiveProfile()).toBe(null);
    });

    it("returns the active profile object", () => {
      localStorage.setItem("activeProfileId", "p1");
      localStorage.setItem("allProfiles", JSON.stringify([{ id: "p1", name: "A" }]));
      expect(getActiveProfile()).toEqual({ id: "p1", name: "A" });
    });
  });

  describe("createProfile", () => {
    it("creates a profile with expected fields", () => {
      const id = createProfile("Max");
      expect(id).toMatch(/^p\d+_[a-z0-9]+$/);
      const profiles = getProfiles();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].name).toBe("Max");
      expect(profiles[0].points).toBe(0);
      expect(profiles[0].streakRecord).toBe(0);
      expect(profiles[0].role).toBe(null);
      expect(profiles[0]._needsRandomAvatar).toBe(true);
    });

    it("appends to existing profiles", () => {
      createProfile("A");
      createProfile("B");
      expect(getProfiles()).toHaveLength(2);
    });
  });

  describe("deleteProfile", () => {
    it("removes a profile by id", () => {
      const id = createProfile("ToDelete");
      deleteProfile(id);
      expect(getProfiles()).toHaveLength(0);
    });

    it("clears activeProfileId if deleted profile was active", () => {
      const id = createProfile("Active");
      localStorage.setItem("activeProfileId", id);
      deleteProfile(id);
      expect(getActiveId()).toBe(null);
    });

    it("does not clear activeProfileId if different profile deleted", () => {
      const id1 = createProfile("Keep");
      const id2 = createProfile("Delete");
      localStorage.setItem("activeProfileId", id1);
      deleteProfile(id2);
      expect(getActiveId()).toBe(id1);
    });
  });

  describe("activateProfile", () => {
    it("sets localStorage keys from profile data", () => {
      const id = createProfile("Test");
      // Manually update the profile in storage
      const profiles = getProfiles();
      profiles[0].points = 100;
      profiles[0].streakRecord = 5;
      profiles[0].role = "teacher";
      profiles[0].appBg = "ocean";
      localStorage.setItem("allProfiles", JSON.stringify(profiles));

      activateProfile(id);

      expect(localStorage.getItem("activeProfileId")).toBe(id);
      expect(localStorage.getItem("points")).toBe("100");
      expect(localStorage.getItem("streakRecord")).toBe("5");
      expect(localStorage.getItem("userRole")).toBe("teacher");
      expect(localStorage.getItem("appBg")).toBe("ocean");
    });

    it("removes userRole if profile has no role", () => {
      localStorage.setItem("userRole", "developer");
      const id = createProfile("NoRole");
      activateProfile(id);
      expect(localStorage.getItem("userRole")).toBe(null);
    });
  });

  describe("saveSnapshot", () => {
    it("saves current localStorage state to active profile", () => {
      const id = createProfile("Snap");
      localStorage.setItem("activeProfileId", id);
      localStorage.setItem("points", "42");
      localStorage.setItem("streakRecord", "8");

      saveSnapshot();

      const profile = getProfiles().find((p) => p.id === id);
      expect(profile.points).toBe(42);
      expect(profile.streakRecord).toBe(8);
    });

    it("does nothing when no active profile", () => {
      createProfile("NoActive");
      // Don't set activeProfileId
      saveSnapshot(); // should not throw
    });
  });

  describe("setAvatarSvg", () => {
    it("saves SVG string to active profile", () => {
      const id = createProfile("Avatar");
      localStorage.setItem("activeProfileId", id);
      setAvatarSvg("<svg>test</svg>");
      const profile = getProfiles().find((p) => p.id === id);
      expect(profile.avatarSvg).toBe("<svg>test</svg>");
    });

    it("does nothing without active profile", () => {
      setAvatarSvg("<svg>test</svg>"); // should not throw
    });
  });
});
