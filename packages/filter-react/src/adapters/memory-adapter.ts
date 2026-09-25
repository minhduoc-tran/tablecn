import type { UrlStateAdapter } from "./url-state-adapter-types"

/** Keeps the value in memory: tests, or a filter that shouldn't touch the URL. */
export function createMemoryAdapter(
  initial: string | null = null
): UrlStateAdapter {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    read: () => value,
    write: (next) => {
      if (next === value) return
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
