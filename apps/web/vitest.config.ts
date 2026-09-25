import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const ui = fileURLToPath(new URL("../../packages/ui/src/", import.meta.url))
const app = fileURLToPath(new URL("./", import.meta.url))

// Mirrors the tsconfig paths; the specific aliases must come before `@/`.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/lib\/utils$/, replacement: `${ui}lib/utils.ts` },
      { find: /^@\/registry\/radix\/ui\//, replacement: `${ui}components/` },
      { find: /^@workspace\/ui\//, replacement: ui },
      { find: /^@\//, replacement: app },
    ],
  },
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    include: ["registry/**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
