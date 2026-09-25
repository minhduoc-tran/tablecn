import {
  DEFAULT_REGISTRY,
  EMPTY_FILTER_STATE,
  decodeFilters,
  encodeFilters,
  enMessages,
  filterReducer,
  jsonApiSerializer,
  mergeMessages,
  type FieldDefinition,
  type FilterAction,
  type FilterMessagesOverrides,
  type FilterRegistry,
  type FilterState,
  type QuerySerializer,
} from "@querycn/filter-core"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { createMemoryAdapter } from "./adapters/memory-adapter"
import type {
  ParamPatch,
  UrlStateAdapter,
} from "./adapters/url-state-adapter-types"
import {
  AppliedFilterContext,
  FilterDraftContext,
  type AppliedFilterValue,
  type FilterDraftValue,
} from "./filter-contexts"
import {
  collectRuleIssues,
  serializerSupports,
} from "./serializer-capabilities"
import { useAdapterValue } from "./use-adapter-value"

const DEFAULT_SERIALIZER = jsonApiSerializer()

type DraftActions = Omit<
  FilterDraftValue,
  "context" | "messages" | "state" | "isDirty" | "canAddRule"
>

// Refs must be current before the next event handler runs; React 18 warns about layout effects on the server.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/** `fields`, `registry`, `serializer` and `messages` should keep their identity (module constant or `useMemo`); a new one rebuilds `query`. */
export interface FilterProviderProps {
  fields: readonly FieldDefinition[]
  /** Where the applied filter lives. Defaults to memory: nothing in the URL. */
  adapter?: UrlStateAdapter
  registry?: FilterRegistry
  /** Builds `query` for `useAppliedFilter`. Defaults to `jsonApiSerializer()`. */
  serializer?: QuerySerializer<unknown>
  maxRules?: number
  messages?: FilterMessagesOverrides
  /** Runs when an apply changes the filter; the params it returns are written along, e.g. `{ page: null }`. */
  onApply?: (state: FilterState) => ParamPatch | void
  children?: ReactNode
}

export function FilterProvider({
  fields,
  adapter: adapterProp,
  registry = DEFAULT_REGISTRY,
  serializer = DEFAULT_SERIALIZER,
  maxRules,
  messages: messageOverrides,
  onApply,
  children,
}: FilterProviderProps) {
  const [memoryAdapter] = useState(() => createMemoryAdapter())
  const [raw, write] = useAdapterValue(adapterProp ?? memoryAdapter)

  const context = useMemo(() => ({ fields, registry }), [fields, registry])
  const messages = useMemo(
    () => mergeMessages(enMessages, messageOverrides),
    [messageOverrides]
  )
  const applied = useMemo(() => decodeFilters(raw, context), [raw, context])
  const queryKey = useMemo(
    () => encodeFilters(applied, context),
    [applied, context]
  )

  const [draft, setDraft] = useState(applied)
  // Keyed on the encoded filter: a new `fields` array with the same content keeps the draft,
  // while fields that change what the URL decodes to resync it.
  const [syncedKey, setSyncedKey] = useState(queryKey)
  if (queryKey !== syncedKey) {
    setSyncedKey(queryKey)
    setDraft(applied)
  }

  // Handlers read these so `setValue(…)` then `apply()` in one handler applies the new value.
  const latest = useRef({ draft, applied, queryKey, onApply })
  useIsomorphicLayoutEffect(() => {
    latest.current = { draft, applied, queryKey, onApply }
  })

  const replaceDraft = useCallback((next: FilterState) => {
    latest.current.draft = next
    setDraft(next)
  }, [])

  const dispatch = useCallback(
    (action: FilterAction) =>
      replaceDraft(
        filterReducer(latest.current.draft, action, { ...context, maxRules })
      ),
    [replaceDraft, context, maxRules]
  )

  const commit = useCallback(
    (state: FilterState) => {
      const value = encodeFilters(state, context)
      // Decoded back so the draft gets the same positional ids as the applied state.
      const next = decodeFilters(value, context)
      if (value !== latest.current.queryKey) {
        write(value, latest.current.onApply?.(next) || undefined)
        // A second commit before the next render builds on this one.
        latest.current.applied = next
        latest.current.queryKey = value
      }
      replaceDraft(next)
    },
    [context, write, replaceDraft]
  )

  const actions = useMemo<DraftActions>(
    () => ({
      addRule: (field) => dispatch({ type: "addRule", field }),
      removeRule: (id) => dispatch({ type: "removeRule", id }),
      setField: (id, field) => dispatch({ type: "setField", id, field }),
      setOperator: (id, operator) =>
        dispatch({ type: "setOperator", id, operator }),
      setValue: (id, value) => dispatch({ type: "setValue", id, value }),
      setJoin: (join) => dispatch({ type: "setJoin", join }),
      apply: () => commit(latest.current.draft),
      reset: () => commit(EMPTY_FILTER_STATE),
      discard: () => replaceDraft(latest.current.applied),
      supportsOperator: (operator) => serializerSupports(serializer, operator),
    }),
    [dispatch, commit, replaceDraft, serializer]
  )

  const draftValue = useMemo<FilterDraftValue>(
    () => ({
      ...actions,
      context,
      messages,
      state: draft,
      isDirty: encodeFilters(draft, context) !== queryKey,
      canAddRule: maxRules === undefined || draft.rules.length < maxRules,
    }),
    [actions, context, messages, draft, queryKey, maxRules]
  )

  const removeAppliedRule = useCallback(
    (id: string) => {
      const { applied } = latest.current
      commit({
        ...applied,
        rules: applied.rules.filter((rule) => rule.id !== id),
      })
    },
    [commit]
  )

  const appliedValue = useMemo<AppliedFilterValue<unknown>>(
    () => ({
      context,
      messages,
      state: applied,
      activeCount: applied.rules.length,
      query: serializer(applied, context),
      queryKey,
      ruleIssues: collectRuleIssues(serializer, applied, context),
      removeRule: removeAppliedRule,
    }),
    [context, messages, applied, serializer, queryKey, removeAppliedRule]
  )

  return (
    <AppliedFilterContext.Provider value={appliedValue}>
      <FilterDraftContext.Provider value={draftValue}>
        {children}
      </FilterDraftContext.Provider>
    </AppliedFilterContext.Provider>
  )
}
