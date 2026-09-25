import { describe, expect, it } from "vitest"

import { enTableMessages } from "./locales/en"
import { viTableMessages } from "./locales/vi"
import { mergeTableMessages } from "./table-messages"

const shape = (messages: object) =>
  Object.entries(messages).map(([group, labels]) => [
    group,
    Object.keys(labels).sort(),
  ])

describe("table messages", () => {
  it("vi has every string en has", () => {
    expect(shape(viTableMessages)).toEqual(shape(enTableMessages))
  })

  it("formats counts", () => {
    expect(enTableMessages.counts.page(2, 5)).toBe("Page 2 of 5")
    expect(enTableMessages.counts.page(2, undefined)).toBe("Page 2")
    expect(viTableMessages.counts.page(2, 5)).toBe("Trang 2/5")
    expect(enTableMessages.counts.rows(1)).toBe("1 row")
    expect(enTableMessages.counts.rows(1234)).toBe("1,234 rows")
    expect(viTableMessages.counts.rows(1234)).toBe("1.234 dòng")
  })

  it("merges overrides per group", () => {
    const messages = mergeTableMessages(enTableMessages, {
      states: { empty: "Nothing here", error: undefined },
    })
    expect(messages.states).toEqual({
      ...enTableMessages.states,
      empty: "Nothing here",
    })
    expect(messages.columns).toBe(enTableMessages.columns)
    expect(mergeTableMessages(enTableMessages)).toEqual(enTableMessages)
  })
})
