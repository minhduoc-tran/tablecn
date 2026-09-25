/** Other URL params to change in the same navigation; `null` removes one. */
export type ParamPatch = Record<string, string | null>

/**
 * Where the encoded filter lives (a URL param, memory…). Built to back
 * `useSyncExternalStore`, so members are called unbound and `read` must return
 * the same string until the value changes.
 */
export interface UrlStateAdapter {
  read: () => string | null
  /**
   * Replaces the current history entry; `null` removes the value. Router-backed
   * adapters apply it on their next render, so don't read back right after.
   * `otherParams` rides along, e.g. `{ page: null }` to reset paging on apply;
   * adapters without a URL ignore it.
   */
  write: (value: string | null, otherParams?: ParamPatch) => void
  /** Needed when the value can change outside React, e.g. back/forward. */
  subscribe?: (onChange: () => void) => () => void
  /**
   * Value during server render and hydration; defaults to `read()`. Adapters
   * that only see the URL in the browser return `null` so hydration matches.
   */
  readServer?: () => string | null
}
