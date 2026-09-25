import { afterEach, describe, expect, it, vi } from "vitest"

import { parseDateOnly, toDateOnly } from "./comparable-values"

afterEach(() => {
  vi.unstubAllEnvs()
})

// Offsets on 2026-03-01, in minutes as `getTimezoneOffset` reports them.
describe.each([
  ["Asia/Ho_Chi_Minh", -420],
  ["America/Los_Angeles", 480],
  ["Pacific/Kiritimati", -840],
])("date-only round trip in %s", (tz, offset) => {
  it("keeps the same day both ways", () => {
    vi.stubEnv("TZ", tz)
    expect(new Date(2026, 2, 1).getTimezoneOffset()).toBe(offset)
    const date = parseDateOnly("2026-03-01")!
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      2026, 2, 1,
    ])
    expect(toDateOnly(date)).toBe("2026-03-01")
    // What a date picker hands back: local midnight of the clicked day.
    expect(toDateOnly(new Date(2026, 11, 31))).toBe("2026-12-31")
  })
})

describe("parseDateOnly", () => {
  it("keeps years below 100", () => {
    const date = parseDateOnly("0099-01-01")!
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([
      99, 0, 1,
    ])
    expect(toDateOnly(date)).toBe("0099-01-01")
  })

  it.each(["2026-02-30", "2026-13-01", "2026-3-1", "2026-03-01T10:00", ""])(
    "rejects %j",
    (value) => {
      expect(parseDateOnly(value)).toBeNull()
    }
  )
})
