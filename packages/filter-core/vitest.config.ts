import { defineConfig } from "vitest/config"

// Core is DOM-free by design, so tests run in plain Node.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
