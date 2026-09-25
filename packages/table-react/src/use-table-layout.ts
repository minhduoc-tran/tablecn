import {
  functionalUpdate,
  type ColumnOrderState,
  type ColumnPinningState,
  type ColumnSizingState,
  type ColumnVisibilityState,
  type OnChangeFn,
  type Updater,
} from "@tanstack/react-table"
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import type { ColumnColorsState } from "./column-color-feature"
import { useStableValue } from "./use-stable-value"
import {
  getLocalStorage,
  readLayout,
  subscribeLayout,
  writeLayout,
  type LayoutStorage,
} from "./layout-storage"
import {
  getLayoutColumns,
  parseLayout,
  serializeLayout,
  type LayoutColumnDef,
  type TableLayoutState,
} from "./table-layout-state"

export interface UseTableLayoutOptions {
  columns: readonly LayoutColumnDef[]
  /** Saves the layout under this key. Without it the layout lasts until unmount. */
  storageKey?: string
  /**
   * Defaults to `localStorage`. Pass a stable object; tabs stay in sync only
   * when it is `localStorage` or `sessionStorage` itself.
   */
  storage?: LayoutStorage
  /** Bump when saved layouts no longer fit the columns; older ones are ignored. */
  version?: number
}

export interface TableLayoutHandlers {
  onColumnVisibilityChange: OnChangeFn<ColumnVisibilityState>
  onColumnOrderChange: OnChangeFn<ColumnOrderState>
  onColumnPinningChange: OnChangeFn<ColumnPinningState>
  onColumnSizingChange: OnChangeFn<ColumnSizingState>
  onColumnColorsChange: OnChangeFn<ColumnColorsState>
}

export interface TableLayout {
  state: TableLayoutState
  handlers: TableLayoutHandlers
  /** Back to the column definitions' layout, forgetting the saved one. */
  reset: () => void
}

const noopSubscribe = () => () => {}

const readNothing = () => null

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? () => {} : useLayoutEffect

/**
 * Column visibility, order, pinning, sizes and colors as controlled TanStack
 * Table state, saved to `localStorage` under `storageKey`. The server and the
 * first client render use the column definitions, so hydration matches.
 */
export function useTableLayout({
  columns,
  storageKey,
  storage: storageOption,
  version = 0,
}: UseTableLayoutOptions): TableLayout {
  const storage = storageKey ? (storageOption ?? getLocalStorage()) : undefined
  const subscribe = useCallback(
    (onChange: () => void) =>
      storageKey
        ? subscribeLayout(storage, storageKey, onChange)
        : noopSubscribe(),
    [storage, storageKey]
  )
  const read = useCallback(
    () => (storageKey ? readLayout(storage, storageKey) : null),
    [storage, storageKey]
  )
  const stored = useSyncExternalStore(subscribe, read, readNothing)
  const [inMemory, setInMemory] = useState<string | null>(null)
  const raw = storageKey ? stored : inMemory

  // Keyed on content: column arrays are often rebuilt each render.
  const columnsKey = JSON.stringify(getLayoutColumns(columns))
  const layoutColumns = useMemo(
    () => JSON.parse(columnsKey) as ReturnType<typeof getLayoutColumns>,
    [columnsKey]
  )
  const parsed = useMemo(
    () => parseLayout(raw, layoutColumns, version),
    [raw, layoutColumns, version]
  )
  // Resizing changes only `columnSizing`; the other slices keep their references for TanStack's memos.
  const columnVisibility = useStableValue(parsed.columnVisibility)
  const columnOrder = useStableValue(parsed.columnOrder)
  const columnPinning = useStableValue(parsed.columnPinning)
  const columnSizing = useStableValue(parsed.columnSizing)
  const columnColors = useStableValue(parsed.columnColors)
  const state = useMemo(
    () => ({
      columnVisibility,
      columnOrder,
      columnPinning,
      columnSizing,
      columnColors,
    }),
    [columnVisibility, columnOrder, columnPinning, columnSizing, columnColors]
  )

  const save = useCallback(
    (value: string | null) => {
      if (storageKey) writeLayout(storage, storageKey, value)
      else setInMemory(value)
    },
    [storage, storageKey]
  )

  // Handlers read this so two changes in one event build on each other.
  const latest = useRef({ state, layoutColumns, version })
  useIsomorphicLayoutEffect(() => {
    latest.current = { state, layoutColumns, version }
  })

  const change = useCallback(
    <K extends keyof TableLayoutState>(
      key: K,
      updater: Updater<TableLayoutState[K]>
    ) => {
      const current = latest.current
      const next = {
        ...current.state,
        [key]: functionalUpdate(updater, current.state[key]),
      }
      current.state = next
      save(serializeLayout(next, current.layoutColumns, current.version))
    },
    [save]
  )

  const handlers = useMemo<TableLayoutHandlers>(
    () => ({
      onColumnVisibilityChange: (updater) =>
        change("columnVisibility", updater),
      onColumnOrderChange: (updater) => change("columnOrder", updater),
      onColumnPinningChange: (updater) => change("columnPinning", updater),
      onColumnSizingChange: (updater) => change("columnSizing", updater),
      onColumnColorsChange: (updater) => change("columnColors", updater),
    }),
    [change]
  )

  const reset = useCallback(() => {
    latest.current.state = parseLayout(
      null,
      latest.current.layoutColumns,
      latest.current.version
    )
    save(null)
  }, [save])

  return { state, handlers, reset }
}
