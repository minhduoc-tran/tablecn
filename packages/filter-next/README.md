# @querycn/filter-next

Next.js App Router bindings for [`@querycn/filter-react`](https://www.npmjs.com/package/@querycn/filter-react): a URL adapter, a ready-wired provider and `parseFilters` for server components and route handlers.

```bash
pnpm add @querycn/filter-core @querycn/filter-react @querycn/filter-next
```

## Usage

Keep `fields` in a module **without** `"use client"`, so both the server page and the client provider can import the real array:

```ts
// app/orders/fields.ts
import type { FieldDefinition } from "@querycn/filter-core"

export const fields: FieldDefinition[] = [
  { name: "status", label: "Status", type: "select", options: [/* … */] },
  { name: "amount", label: "Amount", type: "number" },
]
```

Render the provider from a client component: `onApply`, `loadOptions` and serializers are functions and can't be passed from a server component.

```tsx
// app/orders/orders-filter.tsx
"use client"

import { NextFilterProvider } from "@querycn/filter-next"

import { fields } from "./fields"

export function OrdersFilter({ children }: { children: React.ReactNode }) {
  return (
    <NextFilterProvider fields={fields} onApply={() => ({ page: null })}>
      {children}
    </NextFilterProvider>
  )
}
```

Read the applied filter on the server:

```tsx
// app/orders/page.tsx
import { parseFilters } from "@querycn/filter-next/server"

import { fields } from "./fields"

export default async function Page(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const filter = parseFilters(await props.searchParams, { fields })
  // query your data with `filter` …
}
```

In a route handler: `parseFilters(request.nextUrl.searchParams, { fields })`.

## Notes

- **Suspense.** `useSearchParams` makes a statically prerendered route fail `next build` unless the provider sits inside `<Suspense>`; the subtree then renders on the client only. Routes that await `searchParams` are dynamic and don't need it.
- **`shallow`.** `useNextAdapter({ shallow: true })` (or `<NextFilterProvider shallow>`) updates the URL through the History API without a server request — for data filtered on the client. Leave it off when a server component reads `searchParams`.
- App Router only.

## Credits

Inspired by [FilterCN](https://www.npmjs.com/package/filtercn) (MIT).

## License

MIT
