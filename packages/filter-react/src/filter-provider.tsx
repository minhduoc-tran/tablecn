import {
  DEFAULT_REGISTRY,
  EMPTY_FILTER_STATE,
  decodeFilters,
  encodeFilters,
  enMessages,
  filterReducer,
  defaultUrlFormat,
  isFilterParam,
  jsonApiSerializer,
  mergeMessages,
  type FieldDefinition,
  type FilterContext,
  type FilterAction,
  type FilterMessagesOverrides,
  type FilterRegistry,
  type FilterState,
  type QuerySerializer,
  type UrlFormat,
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

import { applyParamChanges } from "./adapters/apply-param-changes"
import { createMemoryAdapter } from "./adapters/memory-adapter"
import type {
  ParamPatch,
  UrlStateAdapter,
} from "./adapters/url-state-adapter-types"
import {
  AppliedFilterContext,
  FilterActionsContext,
  FilterDraftContext,
  type AppliedFilterValue,
  type FilterActionsValue,
  type FilterDraftValue,
} from "./filter-contexts"
import {
  collectRuleIssues,
  serializerSupports,
} from "./serializer-capabilities"
import { useAdapterValue } from "./use-adapter-value"

const DEFAULT_SERIALIZER = jsonApiSerializer()

// Writes `encoded` in its order, and clears the other filter params in `search`, even ones the decoder dropped.
function filterParamChanges(
  search: string,
  encoded: string,
  context: FilterContext,
  format: UrlFormat
): ParamPatch {
  const changes = new Map<string, string[] | null>()
  for (const [key, value] of new URLSearchParams(encoded)) {
    changes.set(key, [...(changes.get(key) ?? []), value])
  }
  for (const [key, value] of new URLSearchParams(search)) {
    if (!changes.has(key) && isFilterParam(key, value, context, format)) {
      changes.set(key, null)
    }
  }
  return Object.fromEntries(changes)
}

// Refs must be current before the next event handler runs; React 18 warns about layout effects on the server.
const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect

/** `fields`, `registry`, `urlFormat`, `serializer` and `messages` should keep their identity (module constant or `useMemo`); a new one rebuilds `query`. */
export interface FilterProviderProps {
  fields: readonly FieldDefinition[]
  /** Where the applied filter lives. Defaults to memory: nothing in the URL. */
  adapter?: UrlStateAdapter
  registry?: FilterRegistry
  /** How rules map to query params. Defaults to `status__eq=paid`. */
  urlFormat?: UrlFormat
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
  urlFormat = defaultUrlFormat,
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
  // Canonical filter params only, so other params (page, sort…) changing keep `applied` as is.
  const queryKey = useMemo(
    () =>
      encodeFilters(decodeFilters(raw, context, urlFormat), context, urlFormat),
    [raw, context, urlFormat]
  )
  const applied = useMemo(
    () => decodeFilters(queryKey, context, urlFormat),
    [queryKey, context, urlFormat]
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
  const latest = useRef({ raw, draft, applied, queryKey, onApply })
  useIsomorphicLayoutEffect(() => {
    latest.current = { raw, draft, applied, queryKey, onApply }
  })

  const replaceDraft = useCallback((next: FilterState) => {
    latest.current.draft = next
    setDraft(next)
  }, [])

  const supportsOperator = useCallback(
    (operator: string) => serializerSupports(serializer, operator),
    [serializer]
  )

  const dispatch = useCallback(
    (action: FilterAction) =>
      replaceDraft(
        filterReducer(latest.current.draft, action, {
          ...context,
          maxRules,
          supportsOperator,
        })
      ),
    [replaceDraft, context, maxRules, supportsOperator]
  )

  const commit = useCallback(
    (state: FilterState) => {
      const value = encodeFilters(state, context, urlFormat)
      // Decoded back so the draft gets the same positional ids as the applied state.
      const next = decodeFilters(value, context, urlFormat)
      if (value !== latest.current.queryKey) {
        const changes = {
          ...latest.current.onApply?.(next),
          ...filterParamChanges(latest.current.raw, value, context, urlFormat),
        }
        write(changes)
        // A second commit before the next render builds on this one.
        latest.current.raw =
          applyParamChanges(latest.current.raw, changes) ?? latest.current.raw
        latest.current.applied = next
        latest.current.queryKey = value
      }
      replaceDraft(next)
    },
    [context, urlFormat, write, replaceDraft]
  )

  const actions = useMemo<FilterActionsValue>(
    () => ({
      context,
      messages,
      supportsOperator,
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
    }),
    [context, messages, supportsOperator, dispatch, commit, replaceDraft]
  )

  const draftValue = useMemo<FilterDraftValue>(
    () => ({
      ...actions,
      state: draft,
      isDirty: encodeFilters(draft, context, urlFormat) !== queryKey,
      canAddRule: maxRules === undefined || draft.rules.length < maxRules,
    }),
    [actions, context, draft, queryKey, maxRules, urlFormat]
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
      <FilterActionsContext.Provider value={actions}>
        <FilterDraftContext.Provider value={draftValue}>
          {children}
        </FilterDraftContext.Provider>
      </FilterActionsContext.Provider>
    </AppliedFilterContext.Provider>
  )
}
