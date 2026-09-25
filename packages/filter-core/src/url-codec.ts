import { findField, type FilterContext } from "./context"
import { renderQueryString } from "./query-string"
import type { FilterRule, FilterState } from "./types"
import { defaultUrlFormat, type UrlFormat, type UrlRule } from "./url-format"
import { normalizeRule, normalizeState } from "./validation"

const DEFAULT_JOIN_PARAM = "join"

// A custom format may throw on bad input, e.g. `JSON.parse`.
function tryDecodeRule(
  format: UrlFormat,
  key: string,
  value: string,
  context: FilterContext
): UrlRule | null {
  try {
    return format.decodeRule(key, value, context)
  } catch {
    return null
  }
}

/**
 * Whether a param belongs to the filter, including rules the decoder drops, so
 * a write can clear them.
 */
export function isFilterParam(
  key: string,
  value: string,
  context: FilterContext,
  format: UrlFormat = defaultUrlFormat
): boolean {
  if (key === (format.joinParam ?? DEFAULT_JOIN_PARAM)) return true
  const rule = tryDecodeRule(format, key, value, context)
  return rule !== null && findField(context, rule.field) !== undefined
}

/**
 * One param per complete rule, plus the join param for an OR:
 * `status__eq=paid&amount__between=10,50` with the default format. `""` when
 * no rule is complete.
 */
export function encodeFilters(
  state: FilterState,
  context: FilterContext,
  format: UrlFormat = defaultUrlFormat
): string {
  const { join, rules } = normalizeState(state, context)
  const params = new URLSearchParams()
  if (join === "or" && rules.length > 0) {
    params.append(format.joinParam ?? DEFAULT_JOIN_PARAM, "or")
  }
  for (const { field, operator, value } of rules) {
    params.append(...format.encodeRule({ field, operator: operator!, value }))
  }
  return renderQueryString(params)
}

/**
 * Never throws: URLs are user input, so bad rules (unknown field/operator,
 * wrong value) are dropped one by one and unrelated params are ignored. Ids
 * are positional (`u0`, `u1`…) so server and client decode the same URL to the
 * same state.
 */
export function decodeFilters(
  search: string | URLSearchParams | null | undefined,
  context: FilterContext,
  format: UrlFormat = defaultUrlFormat
): FilterState {
  const params =
    search instanceof URLSearchParams
      ? search
      : new URLSearchParams(search ?? "")

  const rules: FilterRule[] = []
  for (const [key, raw] of params) {
    const decoded = tryDecodeRule(format, key, raw, context)
    if (!decoded) continue
    const rule = normalizeRule({ id: `u${rules.length}`, ...decoded }, context)
    if (rule) rules.push(rule)
  }
  const joinParam = format.joinParam ?? DEFAULT_JOIN_PARAM
  return {
    join: params.get(joinParam) === "or" && rules.length > 0 ? "or" : "and",
    rules,
  }
}
