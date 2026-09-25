import { renderQueryString } from "@querycn/filter-core"

import type { ParamPatch } from "./url-state-adapter-types"

const sameValues = (current: string[], next: string[]) =>
  current.length === next.length &&
  current.every((value, index) => value === next[index])

/**
 * The query string after `changes`, or `null` when every value already
 * matches, so adapters can skip a no-op navigation. Other params keep their
 * values; `,` `:` `/` `@` `$` are left unescaped.
 */
export function applyParamChanges(
  search: string,
  changes: ParamPatch
): string | null {
  const params = new URLSearchParams(search)
  const entries = Object.entries(changes)
  if (
    entries.every(([key, value]) =>
      sameValues(params.getAll(key), value === null ? [] : [value].flat())
    )
  ) {
    return null
  }
  for (const [key, value] of entries) {
    params.delete(key)
    if (value !== null) {
      for (const item of [value].flat()) params.append(key, item)
    }
  }
  const next = renderQueryString(params)
  return next ? `?${next}` : ""
}
