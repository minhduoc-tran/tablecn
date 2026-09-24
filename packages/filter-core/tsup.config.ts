import { defineConfig } from "tsup"

// ESM-only output with bundled type declarations. `target` stays conservative
// because this package is consumed by arbitrary bundlers and Node versions.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
})
