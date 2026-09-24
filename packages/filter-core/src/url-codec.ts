import type { FilterContext } from "./context"
import { hasOwn } from "./has-own"
import { EMPTY_FILTER_STATE } from "./reducer"
import type { FilterRule, FilterState, FilterValue, Join } from "./types"
import { normalizeRule, normalizeState } from "./validation"

type EncodedRule =
  | [field: string, operator: string]
  | [field: string, operator: string, value: FilterValue]

const JOINS: readonly Join[] = ["and", "or"]

/**
 * `{"and":[["status","eq","active"],["amount","between",[1,5]]]}` — only
 * complete rules are kept; returns `null` when nothing is left, so the caller
 * can drop the param.
 */
export function encodeFilters(
  state: FilterState,
  context: FilterContext
): string | null {
  const { join, rules } = normalizeState(state, context)
  if (rules.length === 0) return null
  const encoded = rules.map(({ field, operator, value }): EncodedRule =>
    value === null ? [field, operator!] : [field, operator!, value]
  )
  return JSON.stringify({ [join]: encoded })
}

/**
 * Never throws: URLs are user input, so anything malformed (bad JSON, unknown
 * field/operator, wrong value type) is dropped rule by rule. Ids are positional
 * (`u0`, `u1`…) so server and client decode the same URL to the same state.
 */
export function decodeFilters(
  raw: string | null,
  context: FilterContext
): FilterState {
  if (!raw) return EMPTY_FILTER_STATE

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return EMPTY_FILTER_STATE
  }
  if (typeof parsed !== "object" || parsed === null) return EMPTY_FILTER_STATE

  const object = parsed as Record<string, unknown>
  const join = JOINS.find(
    (key) => hasOwn(object, key) && Array.isArray(object[key])
  )
  if (!join) return EMPTY_FILTER_STATE

  const rules: FilterRule[] = []
  for (const entry of object[join] as unknown[]) {
    if (!Array.isArray(entry) || entry.length < 2 || entry.length > 3) continue
    const [field, operator, value = null] = entry as unknown[]
    if (typeof field !== "string" || typeof operator !== "string") continue
    const rule = normalizeRule(
      { id: `u${rules.length}`, field, operator, value: value as FilterValue },
      context
    )
    if (rule) rules.push(rule)
  }
  return { join, rules }
}
