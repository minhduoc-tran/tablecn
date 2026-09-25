import { defineConfig } from "tsup"

// Same output contract as filter-core; react and filter-core stay external.
export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
})
