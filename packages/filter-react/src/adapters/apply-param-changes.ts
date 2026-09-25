import type { ParamPatch } from "./url-state-adapter-types"

/**
 * The query string after `changes`, or `null` when every value already
 * matches, so adapters can skip a no-op navigation. Other params are
 * re-encoded (same values).
 */
export function applyParamChanges(
  search: string,
  changes: ParamPatch
): string | null {
  const params = new URLSearchParams(search)
  const entries = Object.entries(changes)
  if (entries.every(([key, value]) => params.get(key) === value)) return null
  for (const [key, value] of entries) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  const next = params.toString()
  return next ? `?${next}` : ""
}
