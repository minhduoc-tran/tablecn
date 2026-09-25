import type {
  FilterContext,
  FilterState,
  InspectableSerializer,
  OperatorId,
  QuerySerializer,
  RuleIssue,
} from "@querycn/filter-core"

// Hand-written serializers are plain functions without `inspect`/`supports`.
type MaybeInspectable = QuerySerializer<unknown> &
  Partial<Pick<InspectableSerializer<unknown>, "inspect" | "supports">>

export type RuleIssues = Readonly<Record<string, readonly RuleIssue[]>>

export const NO_RULE_ISSUES: RuleIssues = Object.freeze({})

export function serializerSupports(
  serializer: MaybeInspectable,
  operator: OperatorId
): boolean {
  return serializer.supports?.(operator) ?? true
}

export function collectRuleIssues(
  serializer: MaybeInspectable,
  state: FilterState,
  context: FilterContext
): RuleIssues {
  const inspection = serializer.inspect?.(state, context)
  if (!inspection) return NO_RULE_ISSUES
  const issues: Record<string, RuleIssue[]> = {}
  const add = (id: string, issue: RuleIssue) => {
    issues[id] = [...(issues[id] ?? []), issue]
  }
  for (const id of inspection.conflicts) add(id, "conflict")
  for (const id of inspection.skipped) add(id, "unsupported")
  return issues
}
