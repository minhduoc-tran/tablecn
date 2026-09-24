import type { FilterContext } from "../context"
import {
  DEFAULT_REGISTRY,
  getFieldType,
  type FilterRegistry,
} from "../registry"
import { getAppliedRules, type AppliedRule } from "../serializers/applied-rules"
import type {
  FieldDefinition,
  FilterState,
  FilterValue,
  MatchOptions,
  Primitive,
} from "../types"
import { toPrimitive } from "./comparable-values"

export interface ClientFilterContext<Row>
  extends FilterContext, Partial<MatchOptions> {
  /** Defaults to `row[field.name]`. May return a list, e.g. a row's tags. */
  getValue?(row: Row, field: FieldDefinition): unknown
}

type ToComparable = (value: unknown) => Primitive | null

// Functions are inherited members (`constructor`, `toString`), not data.
function readProperty(row: unknown, field: FieldDefinition): unknown {
  if (row === null || typeof row !== "object") return undefined
  const value = (row as Record<string, unknown>)[field.name]
  return typeof value === "function" ? undefined : value
}

const isMissing = (value: unknown) =>
  value === null ||
  value === undefined ||
  (typeof value === "string" && value.trim() === "")

function toExpected(
  rule: AppliedRule,
  toComparable: ToComparable
): FilterValue | undefined {
  if (rule.arity === "none") return null
  if (rule.arity === "single") return toComparable(rule.value) ?? undefined
  const items = rule.value.map(toComparable)
  if (items.some((item) => item == null)) return undefined
  return items as FilterValue
}

// A rule that can't be evaluated excludes every row: an empty table is noticed, a silently ignored filter is not.
function compileRule<Row>(
  rule: AppliedRule,
  registry: FilterRegistry,
  options: MatchOptions,
  getValue: (row: Row, field: FieldDefinition) => unknown
): (row: Row) => boolean {
  const fieldType = getFieldType(rule.definition, registry)
  const toComparable: ToComparable = (value) =>
    fieldType?.toComparable
      ? fieldType.toComparable(value, options)
      : toPrimitive(value)
  const match = registry.operators[rule.operator]?.match
  const expected = toExpected(rule, toComparable)
  if (!match || expected === undefined) return () => false

  return (row) => {
    const actual: Primitive[] = []
    for (const value of [getValue(row, rule.definition)].flat()) {
      if (isMissing(value)) continue
      const comparable = toComparable(value)
      // Present but unreadable (e.g. "1,200" in a number field): not empty, and not a match either.
      if (comparable == null) return false
      actual.push(comparable)
    }
    return match(actual, expected)
  }
}

/** Compiles the applied rules once; pass the result to `Array#filter` or a table's filter function. */
export function createRowMatcher<Row>(
  state: FilterState,
  context: ClientFilterContext<Row>
): (row: Row) => boolean {
  const registry = context.registry ?? DEFAULT_REGISTRY
  const options: MatchOptions = {
    accentInsensitive: context.accentInsensitive ?? true,
  }
  const getValue = context.getValue ?? readProperty
  const { join, rules } = getAppliedRules(state, context)
  const tests = rules.map((rule) =>
    compileRule(rule, registry, options, getValue)
  )
  return join === "or"
    ? (row) => tests.length === 0 || tests.some((test) => test(row))
    : (row) => tests.every((test) => test(row))
}

/**
 * Filters rows already on the client. For paginated APIs send the filter to
 * the backend instead: filtering one page here gives wrong results.
 */
export function applyFilter<Row>(
  rows: readonly Row[],
  state: FilterState,
  context: ClientFilterContext<Row>
): Row[] {
  const matches = createRowMatcher(state, context)
  return rows.filter(matches)
}
