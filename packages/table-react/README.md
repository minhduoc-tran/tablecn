# @querycn/table-react

Headless data table for React on [TanStack Table](https://tanstack.com/table) v9: sorting and pagination synced to the URL, a persisted column layout, row selection, and integration with [`@querycn/filter-react`](../filter-react).

> Work in progress — not published yet.

- **URL state.** Sort, page and page size live next to the filter: `?status__eq=paid&sort=-amount,name&page=2&per_page=50`. Links are shareable, back/forward work, and a new filter sends the page back to 1.
- **Client or server data.** Sort, filter and page rows in the browser, or turn the URL into your backend's params (JSON:API, Django REST framework, PostgREST, or your own).
- **Column layout.** Visibility, order, pinning, widths and colors as TanStack state, saved to `localStorage` and merged with column changes you ship later.
- **Headless.** It returns a TanStack table. The matching UI (Radix UI, Base UI or React Aria) comes from the tablecn shadcn registry as source code.

## Install

```sh
npm install @querycn/table-react @querycn/filter-react @tanstack/react-table
```

Peer dependencies: `react` 18+, `@tanstack/react-table` ^9.2 and `@querycn/filter-react` (the URL adapters and the applied filter come from it, even if you don't filter).

For the UI, add the `data-table` block from the registry: see the [installation docs](https://github.com/minhduoc-tran/tablecn#readme).

## Quick start

Rows in the browser: `useDataTable` sorts and pages them, and applies the filter of the nearest `FilterProvider`.

```tsx
"use client"

import { FilterProvider, useBrowserUrlAdapter } from "@querycn/filter-react"
import {
  createDataTableColumnHelper,
  resetPagePatch,
  useDataTable,
} from "@querycn/table-react"

import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { createSelectionColumn } from "@/components/data-table/data-table-selection-column"

const helper = createDataTableColumnHelper<Order>()
const columns = [
  createSelectionColumn<Order>(),
  helper.accessor("customer", { header: "Customer" }),
  helper.accessor("amount", { header: "Amount", meta: { defaultPinned: "end" } }),
]

export function OrdersPage({ orders }: { orders: Order[] }) {
  const adapter = useBrowserUrlAdapter()
  return (
    <FilterProvider fields={fields} adapter={adapter} onApply={() => resetPagePatch()}>
      <OrdersTable orders={orders} />
    </FilterProvider>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  const table = useDataTable({
    data: orders,
    columns,
    getRowId: (order) => order.id,
    storageKey: "orders-table",
  })
  return (
    <>
      <DataTable table={table} className="max-h-[600px]" />
      <DataTablePagination table={table} />
    </>
  )
}
```

Without a `FilterProvider`, pass `adapter` to `useDataTable` yourself; without one at all, the state lives in memory.

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

On the server, `parseTableParams(searchParams, url)` from `@querycn/table-react/server` reads the same state. Give it the same `url` options as `useDataTable`, with `sortableColumns` listed: column definitions usually live in a client module the server can't call.

## Exports

| Entry | Contents |
| --- | --- |
| `@querycn/table-react` | `useDataTable`, `useTableQuery`, `useTableUrlState`, `useTableLayout`, `createDataTableColumnHelper`, `dataTableFeatures`, `columnColorFeature`, the URL codec (`encodeTableParams`, `decodeTableParams`, `resetPagePatch`, `tableUrlOptions`), params serializers, `enTableMessages`, `mergeTableMessages`, and their types |
| `@querycn/table-react/server` | `parseTableParams`, the URL codec and params serializers, without React: for server components and route handlers |
| `@querycn/table-react/locales/vi` | `viTableMessages` |

## Documentation

The docs site covers each part in detail: overview and live preview, installation, columns, URL state, server data, layout and persistence, virtualization, components and customization. See the `apps/web/content/docs/table` folder of the [repository](https://github.com/minhduoc-tran/tablecn).

## License

MIT
