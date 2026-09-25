import { defineConfig } from "tsup"

export default defineConfig({
  entry: {
    index: "src/index.ts",
    server: "src/server.ts",
    "locales/vi": "src/locales/vi.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
})
