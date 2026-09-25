import {
  applyParamChanges,
  createMemoryAdapter,
  useAdapterValue,
  type ParamPatch,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import type {
  PaginationState,
  SortingState,
  Updater,
} from "@tanstack/react-table"
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"

import {
  decodeTableParams,
  encodeTableParams,
  type TableUrlOptions,
  type TableUrlState,
} from "./table-url-codec"

export interface UseTableUrlStateOptions extends TableUrlOptions {
  /** Pass the `FilterProvider`'s adapter so both share one URL. Defaults to memory. */
  adapter?: UrlStateAdapter
  /** Pages past the last one read as the last one; the URL is left alone. */
  pageCount?: number
  /** Total rows, when the page count isn't known: clamps with the page size in the URL. */
  rowCount?: number
}

export interface TableUrlStateValue extends TableUrlState {
  /** The URL asks for a page past the last one; `pagination` shows the last. */
  isPageClamped: boolean
  onSortingChange: (updater: Updater<SortingState>) => void
  onPaginationChange: (updater: Updater<PaginationState>) => void
}

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? () => {} : useLayoutEffect

const resolve = <T>(updater: Updater<T>, previous: T): T =>
  typeof updater === "function"
    ? (updater as (previous: T) => T)(previous)
    : updater

// Only params whose value moves, so untouched ones keep their place in the URL.
function changedParams(search: string, patch: ParamPatch): ParamPatch {
  return Object.fromEntries(
    Object.entries(patch).filter(
      ([key, value]) => applyParamChanges(search, { [key]: value }) !== null
    )
  )
}

// What the URL reads back: extra or unknown sort columns and unoffered page sizes dropped.
const normalize = (state: TableUrlState, options: TableUrlOptions) =>
  decodeTableParams(
    applyParamChanges("", encodeTableParams(state, options)) ?? "",
    options
  )

const sameSorting = (a: SortingState, b: SortingState) =>
  JSON.stringify(a) === JSON.stringify(b)

function clampPage(
  state: TableUrlState,
  pageCount: number | undefined,
  rowCount: number | undefined
) {
  pageCount ??=
    rowCount === undefined ? undefined : rowCount / state.pagination.pageSize
  // Undefined, NaN or -1 while the total is loading or unknown.
  if (pageCount === undefined || !(pageCount >= 0)) return state
  const lastPageIndex = Math.max(0, Math.ceil(pageCount) - 1)
  if (state.pagination.pageIndex <= lastPageIndex) return state
  return {
    ...state,
    pagination: { ...state.pagination, pageIndex: lastPageIndex },
  }
}

/**
 * Sorting and pagination kept in the URL (`sort`, `page`, `per_page`), as
 * controlled TanStack Table state. Changing the sort or page size goes back
 * to page 1 in the same navigation.
 */
export function useTableUrlState({
  adapter,
  pageCount,
  rowCount,
  ...options
}: UseTableUrlStateOptions = {}): TableUrlStateValue {
  const [memoryAdapter] = useState(() => createMemoryAdapter())
  const [raw, write] = useAdapterValue(adapter ?? memoryAdapter)

  // Keyed on content: callers pass fresh option arrays each render, TanStack wants stable state.
  const key = JSON.stringify(decodeTableParams(raw, options))
  const decoded = useMemo(() => JSON.parse(key) as TableUrlState, [key])
  const state = useMemo(
    () => clampPage(decoded, pageCount, rowCount),
    [decoded, pageCount, rowCount]
  )

  // Handlers read these so two updates in one event build on each other.
  const latest = useRef({ raw, state, options })
  useIsomorphicLayoutEffect(() => {
    latest.current = { raw, state, options }
  })

  const commit = useCallback(
    (next: TableUrlState) => {
      const current = latest.current
      const changes = changedParams(
        current.raw,
        encodeTableParams(next, current.options)
      )
      current.state = next
      if (Object.keys(changes).length === 0) return
      write(changes)
      current.raw = applyParamChanges(current.raw, changes) ?? current.raw
    },
    [write]
  )

  const onSortingChange = useCallback(
    (updater: Updater<SortingState>) => {
      const { state, options } = latest.current
      const { sorting } = normalize(
        { ...state, sorting: resolve(updater, state.sorting) },
        options
      )
      if (sameSorting(sorting, state.sorting)) return
      commit({ sorting, pagination: { ...state.pagination, pageIndex: 0 } })
    },
    [commit]
  )

  const onPaginationChange = useCallback(
    (updater: Updater<PaginationState>) => {
      const { state, options } = latest.current
      const { pagination } = normalize(
        { ...state, pagination: resolve(updater, state.pagination) },
        options
      )
      commit({
        sorting: state.sorting,
        pagination:
          pagination.pageSize === state.pagination.pageSize
            ? pagination
            : { ...pagination, pageIndex: 0 },
      })
    },
    [commit]
  )

  return {
    ...state,
    isPageClamped: state !== decoded,
    onSortingChange,
    onPaginationChange,
  }
}
