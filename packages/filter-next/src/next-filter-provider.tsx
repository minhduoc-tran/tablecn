import { FilterProvider, type FilterProviderProps } from "@querycn/filter-react"

import { useNextAdapter, type NextAdapterOptions } from "./use-next-adapter"

export interface NextFilterProviderProps
  extends Omit<FilterProviderProps, "adapter">, NextAdapterOptions {}

/**
 * `FilterProvider` wired to the URL. Render it from a client component:
 * `fields` holding functions (`loadOptions`) can't cross from the server.
 */
export function NextFilterProvider({
  shallow,
  ...props
}: NextFilterProviderProps) {
  const adapter = useNextAdapter({ shallow })
  return <FilterProvider {...props} adapter={adapter} />
}
