import { applyParamChanges } from "./apply-param-changes"
import type { ParamPatch, UrlStateAdapter } from "./url-state-adapter-types"

// Shared by every instance: `replaceState` fires no event, so each write must tell all readers of the URL.
// One entry per subscription, so the same callback subscribed twice unsubscribes independently.
const subscriptions = new Set<{ onChange: () => void }>()

function notify() {
  for (const { onChange } of subscriptions) onChange()
}

function writeParams(changes: ParamPatch) {
  const search = applyParamChanges(window.location.search, changes)
  if (search === null) return
  const url = new URL(window.location.href)
  url.search = search
  // Keep `history.state`: routers store their own data there.
  window.history.replaceState(window.history.state, "", url)
  notify()
}

const browserUrlAdapter: UrlStateAdapter = {
  read: () => (typeof window === "undefined" ? "" : window.location.search),
  write: (changes) => {
    if (typeof window === "undefined") return
    writeParams(changes)
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
  readServer: () => "",
}

/**
 * Stores the filter in the query string via the History API, for plain
 * React/Vite. With a client router, use its adapter instead: navigations it
 * makes with `pushState` are not observed here.
 */
export function useBrowserUrlAdapter(): UrlStateAdapter {
  return browserUrlAdapter
}
