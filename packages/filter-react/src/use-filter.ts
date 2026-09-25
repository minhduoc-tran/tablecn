import { useContext } from "react"

import { FilterDraftContext, type FilterDraftValue } from "./filter-contexts"

/** The draft being edited; re-renders on every keystroke, so keep it inside the builder UI. */
export function useFilter(): FilterDraftValue {
  const value = useContext(FilterDraftContext)
  if (!value) throw new Error("useFilter must be used inside <FilterProvider>")
  return value
}
