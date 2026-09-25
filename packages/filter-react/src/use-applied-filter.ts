import type { QueryParams } from "@querycn/filter-core"
import { useContext } from "react"

import {
  AppliedFilterContext,
  type AppliedFilterValue,
} from "./filter-contexts"

/**
 * The applied filter; unaffected by draft edits. Outside a provider it returns
 * an empty filter, so a table can read it whether or not filtering is wired up.
 * `T` is the serializer's output type; it is not checked.
 */
export function useAppliedFilter<T = QueryParams>(): AppliedFilterValue<T> {
  return useContext(AppliedFilterContext) as AppliedFilterValue<T>
}
