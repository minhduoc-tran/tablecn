import { toSearchParams, type QueryParams } from "@querycn/filter-core"
import {
  useAdapterValue,
  useAppliedFilter,
  useFilterAdapter,
  type UrlStateAdapter,
} from "@querycn/filter-react"
import { useMemo } from "react"

import type { TableParamsSerializer } from "./table-params-serializers"
import { decodeTableParams, type TableUrlOptions } from "./table-url-codec"
import type { LayoutColumnDef } from "./table-layout-state"
import { tableUrlOptions } from "./table-url-options"
import { useStableValue } from "./use-stable-value"

export interface UseTableQueryOptions {
  /** The same columns and `url` as `useDataTable`, so both read the URL alike. */
  columns: readonly LayoutColumnDef[]
  url?: TableUrlOptions
  /** The same as `useDataTable`'s: `false` leaves the URL's `sort` out. */
  enableSorting?: boolean
  serializer: TableParamsSerializer
  /** Defaults to the nearest `FilterProvider`'s; without one, pass the table's (required). */
  adapter?: UrlStateAdapter
}

export interface TableQuery {
  /** The filter's params (from a params serializer) with sort and page. */
  params: QueryParams
  /** Changes only when the filter, sort or page does: for react-query or SWR keys. */
  queryKey: string
}

function asQueryParams(query: unknown): QueryParams {
  const isParams =
    typeof query === "object" &&
    query !== null &&
    Object.values(query).every(
      (value) =>
        typeof value === "string" ||
        (Array.isArray(value) &&
          value.every((item) => typeof item === "string"))
    )
  if (!isParams) {
    throw new Error(
      "useTableQuery: the FilterProvider's serializer must return query params, e.g. djangoSerializer()."
    )
  }
  return query as QueryParams
}

const warned = new Set<string>()

// A filter field named like a table param (`search` for DRF) would be dropped.
function warnOnClash(filter: QueryParams, table: QueryParams) {
  for (const key of Object.keys(table)) {
    if (!(key in filter) || warned.has(key)) continue
    warned.add(key)
    console.warn(
      `useTableQuery: the table's "${key}" param replaces the filter's. Rename one of them.`
    )
  }
}

/**
 * What to fetch for a server-mode table, read from the URL. Call it before
 * the fetch and `useDataTable` after, since the table needs the fetched rows.
 */
export function useTableQuery({
  columns,
  url,
  enableSorting,
  serializer,
  adapter,
}: UseTableQueryOptions): TableQuery {
  const applied = useAppliedFilter()
  const filterAdapter = useFilterAdapter()
  const shared = adapter ?? filterAdapter
  if (!shared) {
    throw new Error(
      "useTableQuery: pass the table's `adapter`, or render it inside a FilterProvider."
    )
  }
  const [raw] = useAdapterValue(shared)

  const tableParams = useStableValue(
    serializer(
      decodeTableParams(raw, tableUrlOptions(columns, url, { enableSorting }))
    )
  )
  const params = useMemo(() => {
    const filter = asQueryParams(applied.query)
    warnOnClash(filter, tableParams)
    return { ...filter, ...tableParams }
  }, [applied.query, tableParams])
  const tableKey = toSearchParams(tableParams).toString()
  return {
    params,
    queryKey: [applied.queryKey, tableKey].filter(Boolean).join("&"),
  }
}
