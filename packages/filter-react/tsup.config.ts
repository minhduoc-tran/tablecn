import { defineConfig } from "tsup"

// Same output contract as filter-core; react and filter-core stay external.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "react-router": "src/react-router/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2020",
  // The entry exports a provider and hooks, so Next must treat it as client code.
  banner: { js: '"use client"' },
})
