import {
  filterOptions,
  type FieldDefinition,
  type SelectOption,
} from "@querycn/filter-core"
import { useEffect, useMemo, useState } from "react"

import { getFieldOptionsCache, rememberLabels } from "./field-options-cache"

export interface FieldOptionsConfig {
  /** Values to label, e.g. the rule's current value. */
  selected?: readonly string[]
  /** `false` while the list is closed: labels still resolve, the list isn't loaded. */
  enabled?: boolean
  debounceMs?: number
}

export interface FieldOptionsResult {
  /**
   * Options for the current search. While the next list loads, the one on
   * screen stays; after an error it is empty.
   */
  options: readonly SelectOption[]
  loading: boolean
  /** What `loadOptions` rejected with for the current search, else `null`. */
  error: unknown
  /** The search as typed. */
  query: string
  search: (query: string) => void
  retry: () => void
  /** Falls back to the value itself until its label is known. */
  getLabel: (value: string) => string
}

interface Request {
  query: string
  /** Changes on every search and retry, so an old result never counts as current. */
  id: number
  /** The list on screen when this request started. */
  previous: readonly SelectOption[]
}

interface Settled {
  requestId: number
  options: readonly SelectOption[]
  error: unknown
}

const NONE: readonly string[] = []
const NO_OPTIONS: readonly SelectOption[] = []

/**
 * Options for a select field. Static `options` are filtered locally; with
 * `loadOptions`, searches are debounced, superseded requests aborted and
 * results cached per loader (see `clearFieldOptionsCache`).
 *
 * `loadOptions`/`resolveLabels` must keep their identity (module scope or
 * `useMemo`): a new function is a new cache and a new request on every render.
 * Key the component by field if one instance can switch fields.
 */
export function useFieldOptions(
  field: FieldDefinition,
  { selected = NONE, enabled = true, debounceMs = 300 }: FieldOptionsConfig = {}
): FieldOptionsResult {
  const { options: staticOptions, loadOptions, resolveLabels } = field
  const cache = getFieldOptionsCache(field)
  const [request, setRequest] = useState<Request>({
    query: "",
    id: 0,
    previous: NO_OPTIONS,
  })
  const [settled, setSettled] = useState<Settled | null>(null)
  const [, setLabelsVersion] = useState(0)
  const key = request.query.trim()

  useEffect(() => {
    if (!enabled || !loadOptions || !cache || cache.lists.has(key)) return
    const controller = new AbortController()
    const settle = (options: readonly SelectOption[], error: unknown) => {
      if (!controller.signal.aborted) {
        setSettled({ requestId: request.id, options, error })
      }
    }
    const timer = setTimeout(
      () => {
        Promise.resolve()
          .then(() => loadOptions(key, controller.signal))
          .then(
            (options) => {
              cache.lists.set(key, options)
              rememberLabels(cache, options)
              settle(options, null)
            },
            (error: unknown) => settle(NO_OPTIONS, error)
          )
      },
      // The first list shows on open; only typing waits.
      key === "" ? 0 : debounceMs
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [enabled, loadOptions, cache, key, request.id, debounceMs])

  const missingKey =
    resolveLabels && cache
      ? JSON.stringify(
          selected.filter(
            (value) =>
              !cache.labels.has(value) &&
              !cache.unlabeled.has(value) &&
              !staticOptions?.some((option) => option.value === value)
          )
        )
      : "[]"

  useEffect(() => {
    const values = JSON.parse(missingKey) as string[]
    if (!resolveLabels || !cache || values.length === 0) return
    const controller = new AbortController()
    Promise.resolve()
      .then(() => resolveLabels(values, controller.signal))
      .then(
        (options) => {
          rememberLabels(cache, options)
          for (const value of values) {
            if (!cache.labels.has(value)) cache.unlabeled.add(value)
          }
          if (!controller.signal.aborted) setLabelsVersion((v) => v + 1)
        },
        // Not retried on this mount: badges keep showing the raw values.
        () => {}
      )
    return () => controller.abort()
  }, [missingKey, resolveLabels, cache])

  const localOptions = useMemo(
    () => filterOptions(staticOptions ?? NO_OPTIONS, request.query),
    [staticOptions, request.query]
  )

  let options = localOptions
  let loading = false
  let error: unknown = null
  if (loadOptions) {
    const cached = cache?.lists.get(key)
    const current = settled?.requestId === request.id ? settled : null
    options = cached ?? current?.options ?? request.previous
    loading = enabled && !cached && !current
    error = cached ? null : (current?.error ?? null)
  }

  const restart = (query: string) =>
    setRequest((prev) => ({ query, id: prev.id + 1, previous: options }))

  return {
    options,
    loading,
    error,
    query: request.query,
    search: restart,
    retry: () => restart(request.query),
    getLabel: (value) =>
      staticOptions?.find((option) => option.value === value)?.label ??
      cache?.labels.get(value) ??
      value,
  }
}
