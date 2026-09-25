# tablecn

Data table building blocks for [shadcn/ui](https://ui.shadcn.com), on [TanStack Table](https://tanstack.com/table): a conditional filter builder, search, multi-column sorting, pagination and a column layout users shape themselves. Everything that decides which rows you see lives in the URL:

```txt
/orders?q=nguyen&status__eq=paid&sort=-amount&page=2&per_page=50
```

- **Logic ships as npm packages** under `@querycn`: headless, typed and tested.
- **UI ships through a shadcn registry** as `@tablecn/*`. The CLI copies the components into your project, in a [Radix UI](https://www.radix-ui.com), [Base UI](https://base-ui.com) or [React Aria](https://react-spectrum.adobe.com/react-aria/) version.

> Work in progress: the packages aren't on npm yet.

## Features

- **Filter builder**: "Where *Status* is *Paid* and *Amount* is between *10* and *50*". Seven field types, fifteen operators, AND / OR, async options.
- **Search** across columns, ignoring case and accents: `nguyen ha noi` finds "Nguyễn Văn An" in "Hà Nội".
- **URL state**: search, filter, sort and page share one URL. Links are shareable, back/forward work, and a new filter goes back to page 1 in the same navigation.
- **Client or server data**: filter, sort and page rows in the browser, or turn the URL into params for JSON:API, django-filter / Django REST framework, PostgREST or your own backend.
- **Column layout**: reorder by dragging, pin to either side, resize (double-click to fit), hide, color. Saved in `localStorage` and merged with the columns you ship later.
- **Row selection** with a bar for bulk actions, **virtualization** for thousands of rows, loading, empty and error states.
- **Accessible and localized**: keyboard sorting and column moves with announcements; English and Vietnamese included.

## Install the UI

Add the `@tablecn` registry to your `components.json` once, with the folder for your primitive library (`radix`, `base` or `aria`):

```json
{
  "registries": {
    "@tablecn": "https://raw.githubusercontent.com/minhduoc-tran/tablecn/main/apps/web/public/r/radix/{name}.json"
  }
}
```

Then add the blocks:

```bash
npx shadcn@latest add @tablecn/data-table
npx shadcn@latest add @tablecn/filter-builder
```

Once the docs site is deployed, its URL template `https://<site>/r/{style}/{name}.json` picks the version from the `style` in your `components.json` (`radix-nova`, `base-nova`, `aria-nova`…), so the same command works for every library.

| Block | What it is |
| --- | --- |
| `data-table` | The table (sticky header, pinned columns, virtualization), column headers, pagination, the Columns menu, the search box, toolbar and selection bar |
| `filter-builder` | The Filter button and panel, rule rows, value inputs and chips |

## Packages

| Package | What it is | Runs on |
| --- | --- | --- |
| [`@querycn/filter-core`](packages/filter-core) | Rules model, validation, URL codec, backend serializers, client-side filtering. No dependencies. | Anywhere |
| [`@querycn/filter-react`](packages/filter-react) | Filter provider and hooks, URL adapters (browser history, react-router) | React 18+ |
| [`@querycn/filter-next`](packages/filter-next) | Next.js App Router adapter and `parseFilters` for server components | Next.js 14.1+ |
| [`@querycn/table-react`](packages/table-react) | `useDataTable` on TanStack Table v9: URL state, saved layout, search, server params | React 18+ |

## Usage

```tsx
"use client"

import { NextFilterProvider } from "@querycn/filter-next"
import { resetPagePatch, useDataTable } from "@querycn/table-react"

import { DataTable } from "@/components/data-table/data-table"
import { DataTablePagination } from "@/components/data-table/data-table-pagination"
import { DataTableSearch } from "@/components/data-table/data-table-search"
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar"
import { FilterBuilder } from "@/components/filter/filter-builder"
import { FilterChips } from "@/components/filter/filter-chips"

export function OrdersPage({ orders }: { orders: Order[] }) {
  return (
    // A new filter starts again at page 1.
    <NextFilterProvider fields={orderFields} shallow onApply={() => resetPagePatch()}>
      <OrdersTable orders={orders} />
    </NextFilterProvider>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  const table = useDataTable({
    data: orders,
    columns: orderColumns,
    getRowId: (order) => order.id,
    storageKey: "orders-table", // saves the column layout
  })

  return (
    <div className="flex flex-col gap-3">
      <DataTableToolbar table={table}>
        <DataTableSearch table={table} />
        <FilterBuilder />
        <FilterChips />
      </DataTableToolbar>
      <DataTable table={table} className="max-h-[600px]" />
      <DataTablePagination table={table} />
    </div>
  )
}
```

For one page at a time from your backend, `useTableQuery` turns the URL into request params; see the docs.

## Documentation

The docs live in [`apps/web/content/docs`](apps/web/content/docs): overview with a live preview, installation for Next.js, Vite and react-router, fields and operators, URL state, serializers, server data, layout, virtualization, components and customization. Run the site locally to read them with the previews.

## Development

pnpm workspaces and Turborepo. Node 20+ and pnpm 10.

```bash
pnpm install
pnpm dev        # the site on http://localhost:3000, docs at /docs
pnpm test       # vitest in every package
pnpm lint
pnpm typecheck
pnpm build
```

```txt
apps/web/                        docs site (Next.js + Fumadocs) and the registry source
  content/docs/                  MDX pages
  registry/{radix,base,aria}/    UI blocks, one copy per primitive library
  registry/shared/               code the three copies share
  registry.json                  registry definition
  public/r/                      built registry, served at /r and read from GitHub
packages/
  filter-core/  filter-react/  filter-next/  table-react/
```

`apps/web/public/r` is committed. After changing a registry component, run `pnpm registry:build` and commit the result; CI fails when it's out of date.

Releases use [changesets](https://github.com/changesets/changesets): add one with `pnpm changeset`, and merging the "Version Packages" pull request publishes to npm.

## License

MIT
