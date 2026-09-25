import { useMemo } from "react"

import type { ParamPatch, UrlStateAdapter } from "./url-state-adapter-types"

export interface BrowserUrlAdapterOptions {
  /** Query param holding the encoded filter. */
  param?: string
}

// Shared by every instance: `replaceState` fires no event, so each write must tell all readers of the URL.
// One entry per subscription, so the same callback subscribed twice unsubscribes independently.
const subscriptions = new Set<{ onChange: () => void }>()

function notify() {
  for (const { onChange } of subscriptions) onChange()
}

function writeParams(changes: ParamPatch) {
  const params = new URLSearchParams(window.location.search)
  if (
    Object.entries(changes).every(([key, value]) => params.get(key) === value)
  ) {
    return
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  const url = new URL(window.location.href)
  url.search = params.toString()
  // Keep `history.state`: routers store their own data there.
  window.history.replaceState(window.history.state, "", url)
  notify()
}

function createBrowserUrlAdapter(param: string): UrlStateAdapter {
  return {
    read: () =>
      typeof window === "undefined"
        ? null
        : new URLSearchParams(window.location.search).get(param),
    write: (value, otherParams) => {
      if (typeof window === "undefined") return
      writeParams({ ...otherParams, [param]: value })
    },
    subscribe: (onChange) => {
      const subscription = { onChange }
      if (subscriptions.size === 0) {
        window.addEventListener("popstate", notify)
      }
      subscriptions.add(subscription)
      return () => {
        subscriptions.delete(subscription)
        if (subscriptions.size === 0) {
          window.removeEventListener("popstate", notify)
        }
      }
    },
    readServer: () => null,
  }
}

/**
 * Stores the filter in `?filters=` via the History API, for plain React/Vite.
 * Writing re-encodes the other params (same values, e.g. `a,b` → `a%2Cb`).
 * With a client router, use its adapter instead: navigations it makes with
 * `pushState` are not observed here.
 */
export function useBrowserUrlAdapter({
  param = "filters",
}: BrowserUrlAdapterOptions = {}): UrlStateAdapter {
  return useMemo(() => createBrowserUrlAdapter(param), [param])
}
