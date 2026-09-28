import { useCallback, useSyncExternalStore } from "react"

import type { DataTableView } from "./data-table-features"

export const DEFAULT_CARD_BREAKPOINT = 768

export interface UseCardViewOptions {
  view?: DataTableView
  /** In pixels; defaults to 768. */
  cardBreakpoint?: number
}

const noop = () => {}

/**
 * Whether the table shows cards: always for `cards`, never for `table`, and
 * for `auto` (default) while the viewport is narrower than the breakpoint.
 * Takes `table.options.meta`, or the same options before the table exists,
 * e.g. to pick a paged or infinite fetch. `auto` is `false` on the server.
 */
export function useCardView({
  view = "auto",
  cardBreakpoint = DEFAULT_CARD_BREAKPOINT,
}: UseCardViewOptions = {}): boolean {
  const query = view === "auto" ? `(width < ${cardBreakpoint}px)` : null
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!query || typeof window.matchMedia !== "function") return noop
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query]
  )
  const matches = useSyncExternalStore(
    subscribe,
    () =>
      query !== null &&
      typeof window.matchMedia === "function" &&
      window.matchMedia(query).matches,
    () => false
  )
  return view === "cards" || matches
}
