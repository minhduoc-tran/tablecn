import type { AppliedRule } from "./applied-rules"

/**
 * Adjusts a rule before it is encoded: alias the field, reshape the value, or
 * return `undefined` to skip it. Keep `operator` and `arity` as they are
 * (`supports` answers from the operator; rename operators via the preset's
 * `operators`/`lookups`), and keep it pure: serializers may call it more than once.
 */
export type MapRule = (rule: AppliedRule) => AppliedRule | undefined

export interface EncodedRule<E> {
  id: string
  entries: E[]
}

// Skipped ids are the original rule ids, so the UI can point at the rule even if `mapRule` changed it.
export function encodeAppliedRules<E>(
  rules: AppliedRule[],
  mapRule: MapRule | undefined,
  encode: (rule: AppliedRule, index: number) => E[] | undefined
): { encoded: EncodedRule<E>[]; skipped: string[] } {
  const encoded: EncodedRule<E>[] = []
  const skipped: string[] = []
  for (const [index, rule] of rules.entries()) {
    const mapped = mapRule ? mapRule(rule) : rule
    const entries = mapped && encode(mapped, index)
    if (entries?.length) encoded.push({ id: rule.id, entries })
    else skipped.push(rule.id)
  }
  return { encoded, skipped }
}
