import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["core/**/*.js", "vocab/**/*.js"],
      exclude: ["**/node_modules/**", "tests/**"],
      reporter: ["text", "text-summary"],
    },
  },
});
