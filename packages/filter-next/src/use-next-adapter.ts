import { applyParamChanges, type UrlStateAdapter } from "@querycn/filter-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useMemo } from "react"

export interface NextAdapterOptions {
  /**
   * Update the URL without a server request, for data filtered on the
   * client. Leave off when a server component reads `searchParams`.
   */
  shallow?: boolean
}

type NextRouter = ReturnType<typeof useRouter>

// A new URL gives a new adapter, which the provider re-reads on that render.
function createNextAdapter(
  pathname: string,
  search: string,
  router: NextRouter,
  { shallow = false }: NextAdapterOptions
): UrlStateAdapter {
  // Writes chain until then: `router.replace` lands after a server round trip.
  let current = search
  return {
    read: () => search,
    write: (changes) => {
      if (shallow) {
        // The browser URL is current here and keeps `basePath`, which `usePathname` strips.
        const url = new URL(window.location.href)
        const next = applyParamChanges(url.search, changes)
        if (next === null) return
        url.search = next
        // `null`, not `history.state`: Next skips syncing its hooks for states it wrote itself.
        window.history.replaceState(null, "", url)
        return
      }
      const next = applyParamChanges(current, changes)
      if (next === null) return
      current = next
      router.replace(`${pathname}${next}${window.location.hash}`, {
        scroll: false,
      })
    },
  }
}

/**
 * Stores the filter in the query string through the App Router. Writes replace the
 * history entry and keep the path, hash and other params. On a statically
 * prerendered route, wrap the component in `<Suspense>` (`useSearchParams`).
 */
export function useNextAdapter({
  shallow,
}: NextAdapterOptions = {}): UrlStateAdapter {
  // Both can be null under the Pages Router; this adapter targets the App Router.
  const pathname = usePathname() ?? ""
  const search = useSearchParams()?.toString() ?? ""
  const router = useRouter()
  return useMemo(
    () =>
      createNextAdapter(pathname, search ? `?${search}` : "", router, {
        shallow,
      }),
    [pathname, search, router, shallow]
  )
}
