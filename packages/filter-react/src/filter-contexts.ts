import {
  DEFAULT_REGISTRY,
  EMPTY_FILTER_STATE,
  enMessages,
  jsonApiSerializer,
  type FieldDefinition,
  type FilterContext,
  type FilterMessages,
  type FilterState,
  type FilterValue,
  type Join,
  type OperatorId,
  type QueryParams,
} from "@querycn/filter-core"
import { createContext } from "react"

import { NO_RULE_ISSUES, type RuleIssues } from "./serializer-capabilities"

interface FilterConfigValue {
  /** Fields and the resolved registry, ready to pass to core helpers. */
  context: Required<FilterContext>
  messages: FilterMessages
}

/** The rules being edited, not yet applied. */
export interface FilterDraftValue extends FilterConfigValue {
  state: FilterState
  /** Applying would change the applied filter; incomplete rules don't count. */
  isDirty: boolean
  /** `false` once `maxRules` is reached. */
  canAddRule: boolean
  /** Whether the serializer can send this operator; hide the others. */
  supportsOperator: (operator: OperatorId) => boolean
  addRule: (field?: string) => void
  removeRule: (id: string) => void
  setField: (id: string, field: string) => void
  setOperator: (id: string, operator: OperatorId) => void
  setValue: (id: string, value: FilterValue) => void
  setJoin: (join: Join) => void
  /** Writes the complete rules to the adapter; the draft becomes the applied filter. */
  apply: () => void
  /** Clears and applies at once. */
  reset: () => void
  /** Drops unapplied edits. */
  discard: () => void
}

export interface AppliedFilterValue<T = QueryParams> extends FilterConfigValue {
  /** Complete rules only; ids are positional (`u0`, `u1`…). */
  state: FilterState
  activeCount: number
  /** Serializer output, recomputed only when the applied filter changes. */
  query: T
  /** The encoded filter (`null` when empty): a stable string for effect deps and cache keys. */
  queryKey: string | null
  /** Per rule id, how the serializer handled it. Computed on apply, not while editing. */
  ruleIssues: RuleIssues
  /** Removes one applied rule right away, e.g. from a chip. */
  removeRule: (id: string) => void
}

const EMPTY_CONTEXT: Required<FilterContext> = {
  fields: [] as readonly FieldDefinition[],
  registry: DEFAULT_REGISTRY,
}

export const EMPTY_APPLIED_FILTER: AppliedFilterValue<unknown> = {
  context: EMPTY_CONTEXT,
  messages: enMessages,
  state: EMPTY_FILTER_STATE,
  activeCount: 0,
  query: jsonApiSerializer()(EMPTY_FILTER_STATE, EMPTY_CONTEXT),
  queryKey: null,
  ruleIssues: NO_RULE_ISSUES,
  removeRule: () => {},
}

export const FilterDraftContext = createContext<FilterDraftValue | null>(null)

export const AppliedFilterContext =
  createContext<AppliedFilterValue<unknown>>(EMPTY_APPLIED_FILTER)
