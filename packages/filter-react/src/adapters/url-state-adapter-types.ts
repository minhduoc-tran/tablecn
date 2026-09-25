/** Params to change in one navigation; an array repeats the key, `null` removes it. */
export type ParamPatch = Record<string, string | string[] | null>

/**
 * Where the applied filter lives: a query string (`status__eq=paid&page=2`),
 * from the URL or memory. Built to back `useSyncExternalStore`, so members are
 * called unbound and `read` must return the same string until it changes.
 */
export interface UrlStateAdapter {
  read: () => string
  /**
   * Replaces the current history entry. Router-backed adapters apply it on
   * their next render, so don't read back right after.
   */
  write: (changes: ParamPatch) => void
  /** Needed when the value can change outside React, e.g. back/forward. */
  subscribe?: (onChange: () => void) => () => void
  /**
   * Value during server render and hydration; defaults to `read()`. Adapters
   * that only see the URL in the browser return `""` so hydration matches.
   */
  readServer?: () => string
}
