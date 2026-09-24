// Placeholder test proving the toolchain runs. Removed in phase 02.
import { describe, expect, it } from "vitest"

import { VERSION } from "./index"

describe("filter-core scaffold", () => {
  it("exposes a version string", () => {
    expect(typeof VERSION).toBe("string")
  })
})
