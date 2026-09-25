// @vitest-environment node
import { readFileSync } from "node:fs"

import { describe, expect, it } from "vitest"

describe("server entry", () => {
  // Importing client code (or the directive) would make parseFilters unusable in server components.
  it("stays free of client modules", () => {
    const source = readFileSync(new URL("./server.ts", import.meta.url), "utf8")
    expect(source).not.toMatch(/use client|filter-react|next\/navigation/)
  })
})
