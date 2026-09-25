// @vitest-environment node
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

const read = (file: string) =>
  readFileSync(new URL(file, import.meta.url), "utf8")

describe("server entry", () => {
  // Client code (or the directive) would make parseTableParams unusable in server components.
  it.each([
    "./server.ts",
    "./table-url-codec.ts",
    "./table-params-serializers.ts",
    "./table-url-options.ts",
    "./table-layout-state.ts",
  ])("%s stays free of client modules", (file) => {
    const source = read(file)
    expect(source).not.toMatch(/use client/)
    expect(source).not.toMatch(
      /^import (?!type)[^;]*from "(react|@querycn\/filter-react|@tanstack\/react-table)"/m
    )
  })
})
