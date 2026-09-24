import type { FilterContext } from "../context"
import type { FilterState, Primitive } from "../types"
import { getAppliedRules, type AppliedRule } from "./applied-rules"
import { encodeAppliedRules, type MapRule } from "./encode-applied-rules"
import { mapOperator, type OperatorMapping } from "./operator-mapping"
import {
  addParam,
  createQueryParams,
  type InspectableSerializer,
  type QueryParams,
} from "./query-params"

type Quote = (text: string) => string

/**
 * Returns `operator.value` filters for one rule (`between` needs two), or `[]`
 * to skip it. Pass every user-supplied piece through `quote`: it is a no-op for
 * top-level params and quotes reserved characters inside `or=(…)`.
 */
export type PostgrestFilter = (rule: AppliedRule, quote: Quote) => string[]

const RESERVED = /[,.:()"\\\s]/

// Inside `in.(…)` and `or=(…)` PostgREST splits on reserved characters unless the item is quoted.
const quoteIfNeeded: Quote = (text) =>
  text === "" || RESERVED.test(text)
    ? `"${text.replace(/[\\"]/g, "\\$&")}"`
    : text

const noQuote: Quote = (text) => text

// Escapes LIKE wildcards in user input; `*` can't be escaped and stays a wildcard.
const escapeLike = (value: Primitive) =>
  String(value).replace(/[\\%_]/g, "\\$&")

const formatInList = (values: Primitive[]) =>
  `(${values.map((item) => quoteIfNeeded(String(item))).join(",")})`

// Builders check the arity because a custom registry may redefine a built-in operator.
const compare =
  (operator: string): PostgrestFilter =>
  (rule, quote) =>
    rule.arity === "single" ? [`${operator}.${quote(String(rule.value))}`] : []

const like =
  (operator: string, pattern: (text: string) => string): PostgrestFilter =>
  (rule, quote) =>
    rule.arity === "single"
      ? [`${operator}.${quote(pattern(escapeLike(rule.value)))}`]
      : []

const inList =
  (operator: string): PostgrestFilter =>
  (rule) =>
    rule.arity === "multi" ? [`${operator}.${formatInList(rule.value)}`] : []

const DEFAULT_FILTERS: OperatorMapping<PostgrestFilter> = {
  eq: compare("eq"),
  ne: compare("neq"),
  gt: compare("gt"),
  gte: compare("gte"),
  lt: compare("lt"),
  lte: compare("lte"),
  contains: like("ilike", (text) => `*${text}*`),
  notContains: like("not.ilike", (text) => `*${text}*`),
  startsWith: like("ilike", (text) => `${text}*`),
  endsWith: like("ilike", (text) => `*${text}`),
  between: (rule, quote) =>
    rule.arity === "range"
      ? [
          `gte.${quote(String(rule.value[0]))}`,
          `lte.${quote(String(rule.value[1]))}`,
        ]
      : [],
  in: inList("in"),
  notIn: inList("not.in"),
  isEmpty: () => ["is.null"],
  isNotEmpty: () => ["not.is.null"],
}

export interface PostgrestSerializerOptions {
  /** Merged over the defaults, e.g. `{ contains: (rule, quote) => [\`fts.${quote(String(rule.value))}\`] }`. */
  operators?: OperatorMapping<PostgrestFilter>
  mapRule?: MapRule
}

/**
 * AND → one param per field (`amount=gte.1&amount=lte.5`); OR →
 * `or=(status.eq.a,amount.gt.1)`. Operators without a filter are skipped.
 * Repeated keys are valid here (PostgREST ANDs them), so `conflicts` is always empty.
 */
export function postgrestSerializer({
  operators,
  mapRule,
}: PostgrestSerializerOptions = {}): InspectableSerializer {
  const filterByOperator = { ...DEFAULT_FILTERS, ...operators }
  const encodeRules = (rules: AppliedRule[], quote: Quote) =>
    encodeAppliedRules(rules, mapRule, (rule) =>
      mapOperator(filterByOperator, rule.operator)?.(rule, quote).map(
        (filter) => ({ field: rule.field, filter })
      )
    )

  const serialize = (
    state: FilterState,
    context: FilterContext
  ): QueryParams => {
    const { join, rules } = getAppliedRules(state, context)

    if (join === "or") {
      const conditions = encodeRules(rules, quoteIfNeeded).encoded.map(
        ({ entries }) => {
          const filters = entries.map(
            ({ field, filter }) => `${field}.${filter}`
          )
          return filters.length > 1 ? `and(${filters.join(",")})` : filters[0]!
        }
      )
      if (conditions.length > 1) {
        return { or: `(${conditions.join(",")})` }
      }
    }

    const params = createQueryParams()
    for (const { entries } of encodeRules(rules, noQuote).encoded) {
      for (const { field, filter } of entries) addParam(params, field, filter)
    }
    return params
  }

  const inspect = (state: FilterState, context: FilterContext) => ({
    skipped: encodeRules(getAppliedRules(state, context).rules, noQuote)
      .skipped,
    conflicts: [],
  })

  const supports = (operator: string) =>
    mapOperator(filterByOperator, operator) !== undefined

  return Object.assign(serialize, { inspect, supports })
}
