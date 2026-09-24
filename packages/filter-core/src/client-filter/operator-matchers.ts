import type { BuiltinOperatorId, OperatorDefinition, Primitive } from "../types"

type Match = NonNullable<OperatorDefinition["match"]>

// A row value that is a list matches when any item does; negations then mean "no item does".
const anyItem =
  <E>(test: (item: Primitive, expected: E) => boolean): Match =>
  (items, expected) =>
    items.some((item) => test(item, expected as E))

const not =
  (match: Match): Match =>
  (items, expected) =>
    !match(items, expected)

// Mixed types (e.g. a text column under a number field) and NaN never compare.
function compare(a: Primitive, b: Primitive): number | undefined {
  if (typeof a !== typeof b || typeof a === "boolean") return undefined
  if (Number.isNaN(a) || Number.isNaN(b)) return undefined
  return a < b ? -1 : a > b ? 1 : 0
}

const ordered = (test: (order: number) => boolean) =>
  anyItem<Primitive>((item, expected) => {
    const order = compare(item, expected)
    return order !== undefined && test(order)
  })

const text = (test: (item: string, expected: string) => boolean) =>
  anyItem<Primitive>((item, expected) => test(String(item), String(expected)))

const eq = anyItem<Primitive>((item, expected) => item === expected)
const contains = text((item, expected) => item.includes(expected))
const inList = anyItem<Primitive[]>((item, expected) => expected.includes(item))
const isEmpty: Match = (items) => items.length === 0

export const BUILTIN_MATCHERS: Readonly<Record<BuiltinOperatorId, Match>> = {
  eq,
  ne: not(eq),
  contains,
  notContains: not(contains),
  startsWith: text((item, expected) => item.startsWith(expected)),
  endsWith: text((item, expected) => item.endsWith(expected)),
  gt: ordered((order) => order > 0),
  gte: ordered((order) => order >= 0),
  lt: ordered((order) => order < 0),
  lte: ordered((order) => order <= 0),
  between: anyItem<[Primitive, Primitive]>((item, [from, to]) => {
    const fromOrder = compare(item, from)
    const toOrder = compare(item, to)
    return (
      fromOrder !== undefined &&
      toOrder !== undefined &&
      fromOrder >= 0 &&
      toOrder <= 0
    )
  }),
  in: inList,
  notIn: not(inList),
  isEmpty,
  isNotEmpty: not(isEmpty),
}
