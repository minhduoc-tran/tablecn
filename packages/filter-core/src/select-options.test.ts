import { describe, expect, it } from "vitest"

import { filterOptions } from "./select-options"

const CITIES = [
  { label: "Đà Nẵng", value: "dn" },
  { label: "Hà Nội", value: "hn" },
  { label: "Huế", value: "hue" },
]

describe("filterOptions", () => {
  it("returns every option for a blank search", () => {
    expect(filterOptions(CITIES, "  ")).toBe(CITIES)
  })

  it("ignores case and accents", () => {
    expect(filterOptions(CITIES, "da nang").map((o) => o.value)).toEqual(["dn"])
    expect(filterOptions(CITIES, "HUẾ").map((o) => o.value)).toEqual(["hue"])
  })

  it("matches anywhere in the label", () => {
    expect(filterOptions(CITIES, "n").map((o) => o.value)).toEqual(["dn", "hn"])
  })
})
