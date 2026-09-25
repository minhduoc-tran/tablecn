import {
  getRuleWarnings,
  normalizeRule,
  type FilterContext,
  type FilterRule,
  type RuleIssue,
  type RuleWarning,
} from "@querycn/filter-core"
import { useMemo } from "react"

import { useAppliedFilter } from "./use-applied-filter"
import { useFilter } from "./use-filter"

export type RuleWarningKey = RuleWarning | RuleIssue

const NO_WARNINGS: readonly RuleWarningKey[] = []

function sameRule(
  draft: FilterRule | undefined,
  applied: FilterRule | undefined,
  context: FilterContext
): boolean {
  if (!draft || !applied || draft.id !== applied.id) return false
  const normalized = normalizeRule(draft, context)
  return (
    normalized !== null &&
    normalized.field === applied.field &&
    normalized.operator === applied.operator &&
    JSON.stringify(normalized.value) === JSON.stringify(applied.value)
  )
}

/**
 * Keys into `messages.warnings` for one draft rule. Warnings never block
 * applying. Reads the draft, so render it in a small leaf, not the whole row.
 */
export function useRuleWarnings(rule: FilterRule): readonly RuleWarningKey[] {
  const { context, state: draft } = useFilter()
  const { state: applied, ruleIssues } = useAppliedFilter()

  return useMemo(() => {
    const warnings: RuleWarningKey[] = [...getRuleWarnings(rule, context)]
    // Serializer issues describe what was applied; once the draft differs they may not hold.
    const index = applied.rules.findIndex((r) => r.id === rule.id)
    if (index !== -1 && sameRule(rule, applied.rules[index], context)) {
      // A conflict also depends on the rules before it and on the join.
      const conflictHolds =
        draft.join === applied.join &&
        applied.rules
          .slice(0, index)
          .every((r, i) => sameRule(draft.rules[i], r, context))
      for (const issue of ruleIssues[rule.id] ?? []) {
        if (issue !== "conflict" || conflictHolds) warnings.push(issue)
      }
    }
    return warnings.length > 0 ? warnings : NO_WARNINGS
  }, [rule, context, draft, applied, ruleIssues])
}
