import { useMemo } from "react"
import {
  useLocation,
  useNavigate,
  type Location,
  type NavigateFunction,
} from "react-router"

import { applyParamChanges } from "../adapters/apply-param-changes"
import type { UrlStateAdapter } from "../adapters/url-state-adapter-types"

export interface ReactRouterAdapterOptions {
  /** Query param holding the encoded filter. */
  param?: string
}

// A new location gives a new adapter, which the provider re-reads on that render.
function createReactRouterAdapter(
  { pathname, search, hash, state }: Location,
  navigate: NavigateFunction,
  param: string
): UrlStateAdapter {
  // Writes chain until then: the router may not have applied the previous one yet.
  let current = search
  return {
    read: () => new URLSearchParams(search).get(param),
    write: (value, otherParams) => {
      const next = applyParamChanges(current, {
        ...otherParams,
        [param]: value,
      })
      if (next === null) return
      current = next
      void navigate(
        { pathname, search: next, hash },
        { replace: true, state, preventScrollReset: true }
      )
    },
  }
}

/**
 * Stores the filter in `?filters=` through react-router (v6.4+ and v7), so
 * back/forward and the router's own navigations stay in sync. Writes replace
 * the history entry and keep the path, hash, state and other params.
 *
 * v6 apps must also install `react-router` at the exact version
 * `react-router-dom` depends on; a second copy has its own router context.
 * With `<ScrollRestoration>`, a URL hash makes each write scroll to its target.
 */
export function useReactRouterAdapter({
  param = "filters",
}: ReactRouterAdapterOptions = {}): UrlStateAdapter {
  const location = useLocation()
  const navigate = useNavigate()
  return useMemo(
    () => createReactRouterAdapter(location, navigate, param),
    [location, navigate, param]
  )
}
