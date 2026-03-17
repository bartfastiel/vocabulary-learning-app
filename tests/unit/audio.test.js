import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock Audio constructor before importing audio.js
const mockPlay = vi.fn(() => Promise.resolve());
const mockAudioInstances = [];

globalThis.Audio = vi.fn((src) => {
  const instance = { src, play: mockPlay };
  mockAudioInstances.push(instance);
  return instance;
});

describe("audio", () => {
  let playSound, playVoice;

  beforeEach(async () => {
    mockPlay.mockClear();
    mockAudioInstances.length = 0;
    globalThis.Audio.mockClear();
    const mod = await import("../../core/audio.js");
    playSound = mod.playSound;
    playVoice = mod.playVoice;
  });

  describe("playSound", () => {
    it("creates Audio with correct path for ding", () => {
      playSound("ding");
      expect(globalThis.Audio).toHaveBeenCalledWith("assets/audio/ding.mp3");
      expect(mockPlay).toHaveBeenCalled();
    });

    it("creates Audio with correct path for buzz", () => {
      playSound("buzz");
      expect(globalThis.Audio).toHaveBeenCalledWith("assets/audio/buzz.mp3");
    });
  });

  describe("playVoice", () => {
    it("creates Audio with normalized word path", () => {
      playVoice("Hello");
      const src = globalThis.Audio.mock.calls[0][0];
      expect(src).toMatch(/^assets\/audio\/voice\/hello_(alloy|ash|coral|nova|onyx)\.mp3$/);
    });

    it("normalizes special characters to underscore", () => {
      playVoice("Let's go!");
      const src = globalThis.Audio.mock.calls[0][0];
      // "Let's go!" → "let_s_go_"
      expect(src).toMatch(/^assets\/audio\/voice\/let_s_go_/);
    });

    it("returns the audio object", () => {
      const result = playVoice("test");
      expect(result).toBeDefined();
      expect(result.play).toBeDefined();
    });

    it("handles play rejection silently", () => {
      mockPlay.mockRejectedValueOnce(new Error("blocked"));
      expect(() => playVoice("test")).not.toThrow();
    });
  });
});
