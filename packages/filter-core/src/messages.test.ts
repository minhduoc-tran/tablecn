import { describe, expect, it } from "vitest"

import { enMessages } from "./locales/en"
import { viMessages } from "./locales/vi"
import { getOperatorLabel, mergeMessages } from "./messages"

const shape = (value: unknown): unknown =>
  typeof value === "function"
    ? "function"
    : typeof value === "object" && value !== null
      ? Object.fromEntries(
          Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, item]) => [key, shape(item)])
        )
      : typeof value

describe("locales", () => {
  // operatorsByType is optional wording that differs per language.
  it("vi has exactly the keys of en", () => {
    const withoutTypes = (messages: object) => ({
      ...messages,
      operatorsByType: undefined,
    })
    expect(shape(withoutTypes(viMessages))).toEqual(
      shape(withoutTypes(enMessages))
    )
  })
})

describe("mergeMessages", () => {
  it("overrides single entries and keeps the rest of the group", () => {
    const merged = mergeMessages(enMessages, {
      actions: { apply: "Go" },
      loading: "Wait",
    })
    expect(merged.actions).toEqual({ ...enMessages.actions, apply: "Go" })
    expect(merged.loading).toBe("Wait")
    expect(merged.join).toBe(enMessages.join)
  })

  it("merges operatorsByType per field type", () => {
    const merged = mergeMessages(enMessages, {
      operatorsByType: { date: { gt: "after" }, money: { eq: "costs" } },
    })
    expect(getOperatorLabel(merged, "gt", "date")).toBe("after")
    expect(getOperatorLabel(merged, "gte", "date")).toBe("is on or after")
    expect(getOperatorLabel(merged, "eq", "money")).toBe("costs")
  })

  it("never replaces a label with undefined", () => {
    const merged = mergeMessages(enMessages, {
      actions: { apply: undefined },
      loading: undefined,
    })
    expect(merged.actions.apply).toBe("Apply")
    expect(merged.loading).toBe("Loading…")
  })

  it("accepts count functions", () => {
    const merged = mergeMessages(viMessages, {
      counts: { selected: (count) => `${count} mục` },
    })
    expect(merged.counts.selected(3)).toBe("3 mục")
    expect(merged.counts.more(2)).toBe("+2")
  })

  it("does not mutate the base", () => {
    mergeMessages(enMessages, { actions: { apply: "Go" } })
    expect(enMessages.actions.apply).toBe("Apply")
  })
})

describe("getOperatorLabel", () => {
  it("prefers the field type's wording", () => {
    expect(getOperatorLabel(viMessages, "gt", "date")).toBe("sau")
    expect(getOperatorLabel(viMessages, "gt", "number")).toBe("lớn hơn")
    expect(getOperatorLabel(viMessages, "eq", "number")).toBe("bằng")
    expect(getOperatorLabel(viMessages, "eq", "select")).toBe("là")
    expect(getOperatorLabel(viMessages, "between", "date")).toBe("trong khoảng")
  })

  it("falls back to the operator id for unlabeled operators", () => {
    const messages = mergeMessages(enMessages, {
      operators: { near: "is near" },
    })
    expect(getOperatorLabel(messages, "near")).toBe("is near")
    expect(getOperatorLabel(enMessages, "near")).toBe("near")
    expect(getOperatorLabel(enMessages, "toString")).toBe("toString")
  })
})
