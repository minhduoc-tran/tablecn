# @querycn/table-react

Headless data table for React on [TanStack Table](https://tanstack.com/table) v9: sorting and pagination synced to the URL, a persisted column layout, and integration with [`@querycn/filter-react`](../filter-react).

> Work in progress — not published yet.

## Server-side data

`useTableQuery` reads the filter, sort and page from the URL and turns them into your backend's params. Call it before fetching, then hand the rows to `useDataTable`. With [TanStack Query](https://tanstack.com/query):

```tsx
"use client"

import { djangoSerializer } from "@querycn/filter-core"
import { NextFilterProvider } from "@querycn/filter-next"
import { resetPagePatch } from "@querycn/table-react"

export function OrdersPage() {
  return (
    <NextFilterProvider
      fields={fields}
      serializer={djangoSerializer()}
      // A new filter starts again at page 1.
      onApply={() => resetPagePatch()}
    >
      <OrdersTable />
    </NextFilterProvider>
  )
}
```

```tsx
import { toSearchParams } from "@querycn/filter-core"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import {
  djangoTableParams,
  useDataTable,
  useTableQuery,
} from "@querycn/table-react"

const serializer = djangoTableParams()
const NO_ORDERS: Order[] = []

function OrdersTable() {
  const { params, queryKey } = useTableQuery({ columns, serializer })
  const orders = useQuery({
    queryKey: ["orders", queryKey],
    queryFn: () =>
      fetch(`/api/orders?${toSearchParams(params)}`).then((r) => r.json()),
    placeholderData: keepPreviousData,
  })
  const table = useDataTable({
    mode: "server",
    columns,
    data: orders.data?.results ?? NO_ORDERS,
    rowCount: orders.data?.count,
    getRowId: (order) => order.id,
  })
  // render `table`…
}
```

Presets: `djangoTableParams()` (`ordering`, `page`, `page_size`), `jsonApiTableParams()` (`sort`, `page[number]`, `page[size]`) and `postgrestTableParams()` (`order`, `limit`, `offset`). A serializer is any `(state) => params` function, so other backends need only a few lines.

On the server, `parseTableParams(searchParams, tableUrlOptions(columns))` from `@querycn/table-react/server` reads the same state.

## License

MIT
