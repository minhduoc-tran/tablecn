import { expect, it } from "vitest"

import { formatValue, toSearchParams } from "./query-params"

it("toSearchParams repeats array keys", () => {
  expect(toSearchParams({ a: "1", b: ["x", "y,z"], c: [] }).toString()).toBe(
    "a=1&b=x&b=y%2Cz"
  )
})

it.each([
  [null, "repeat", "true"],
  [5, "repeat", "5"],
  [false, "comma", "false"],
  [["a", 1], "repeat", ["a", "1"]],
  [["a", 1], "comma", "a,1"],
] as const)("formatValue(%j, %s) → %j", (value, format, expected) => {
  expect(formatValue(value as never, format)).toEqual(expected)
})
