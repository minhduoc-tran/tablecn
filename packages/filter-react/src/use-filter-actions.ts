import { useContext } from "react"

import {
  FilterActionsContext,
  type FilterActionsValue,
} from "./filter-contexts"

/**
 * Actions, fields and messages without the draft state, so a component using it
 * (e.g. a memoized rule row) doesn't re-render on every keystroke elsewhere.
 */
export function useFilterActions(): FilterActionsValue {
  const value = useContext(FilterActionsContext)
  if (!value) {
    throw new Error("useFilterActions must be used inside <FilterProvider>")
  }
  return value
}
