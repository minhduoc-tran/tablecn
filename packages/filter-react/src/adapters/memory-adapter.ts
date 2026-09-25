import { applyParamChanges } from "./apply-param-changes"
import type { UrlStateAdapter } from "./url-state-adapter-types"

/** Keeps a query string in memory: tests, or a filter that shouldn't touch the URL. */
export function createMemoryAdapter(initial = ""): UrlStateAdapter {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    read: () => value,
    write: (changes) => {
      const next = applyParamChanges(value, changes)
      if (next === null) return
      value = next
      for (const listener of listeners) listener()
    },
    subscribe: (onChange) => {
      const listener = () => onChange()
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
