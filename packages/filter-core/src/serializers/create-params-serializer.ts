import type { FilterContext } from "../context"
import type { FilterState, Join, OperatorId } from "../types"
import { getAppliedRules, type AppliedRule } from "./applied-rules"
import { encodeAppliedRules, type MapRule } from "./encode-applied-rules"
import {
  addParam,
  createQueryParams,
  type InspectableSerializer,
  type QueryParams,
} from "./query-params"

export type ParamEntry = [key: string, value: string | string[]]

export interface ParamsSerializerConfig {
  /** Params for one rule; return nothing to skip a rule the backend can't express. */
  encodeRule(
    rule: AppliedRule,
    meta: { index: number; join: Join }
  ): ParamEntry[] | undefined
  /** Added when an OR has two or more encoded rules, e.g. `{ conjunction: "or" }`. */
  orParams?: QueryParams
  mapRule?: MapRule
  /** Defaults to every operator. */
  supports?: (operator: OperatorId) => boolean
}

export function createParamsSerializer({
  encodeRule,
  orParams,
  mapRule,
  supports = () => true,
}: ParamsSerializerConfig): InspectableSerializer {
  const encodeRules = (state: FilterState, context: FilterContext) => {
    const { join, rules } = getAppliedRules(state, context)
    return {
      join,
      ...encodeAppliedRules(rules, mapRule, (rule, index) =>
        encodeRule(rule, { index, join })
      ),
    }
  }

  const serialize = (state: FilterState, context: FilterContext) => {
    const { join, encoded } = encodeRules(state, context)
    const params = createQueryParams()
    for (const { entries } of encoded) {
      for (const [key, value] of entries) addParam(params, key, value)
    }
    if (join === "or" && encoded.length > 1 && orParams) {
      Object.assign(params, orParams)
    }
    return params
  }

  const inspect = (state: FilterState, context: FilterContext) => {
    const { join, encoded, skipped } = encodeRules(state, context)
    // orParams are written last, so a rule sharing one of their keys loses its value.
    const seenKeys = new Set<string>(
      join === "or" && encoded.length > 1 && orParams
        ? Object.keys(orParams)
        : []
    )
    const conflicts: string[] = []
    for (const { id, entries } of encoded) {
      // A rule may repeat its own key (e.g. a range sent as two values); only clashes with earlier rules count.
      const keys = new Set(entries.map(([key]) => key))
      if ([...keys].some((key) => seenKeys.has(key))) conflicts.push(id)
      for (const key of keys) seenKeys.add(key)
    }
    return { skipped, conflicts }
  }

  return Object.assign(serialize, { inspect, supports })
}
