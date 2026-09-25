import { highlight } from "fumadocs-core/highlight"
import { CheckIcon } from "lucide-react"

import { DocsPre } from "@/components/docs/mdx/docs-code-block"

const CODE = `"use client"

export function Orders({ orders }: { orders: Order[] }) {
  const table = useDataTable({
    data: orders,
    columns,
    getRowId: (order) => order.id,
    storageKey: "orders",
  })

  return (
    <NextFilterProvider fields={fields} onApply={() => resetPagePatch()}>
      <DataTableToolbar table={table}>
        <FilterBuilder />
        <FilterChips />
      </DataTableToolbar>
      <DataTable table={table} className="h-[600px]" />
      <DataTablePagination table={table} />
    </NextFilterProvider>
  )
}`

const POINTS = [
  "Filter, sort and page share one URL, through one adapter.",
  "A new filter goes back to page 1 in the same navigation.",
  "The column layout is saved under storageKey.",
  "Every piece is a file in your project: restyle or rewrite it.",
]

export async function HomeCode() {
  const code = await highlight(CODE, {
    lang: "tsx",
    themes: { light: "github-light", dark: "github-dark" },
    components: { pre: (props) => <DocsPre {...props} /> },
  })

  return (
    <section className="border-y bg-muted/20">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-24 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-4">
          <span className="text-sm font-medium text-muted-foreground">
            Developer experience
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-balance md:text-4xl">
            One hook, a few components
          </h2>
          <p className="text-muted-foreground">
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              useDataTable
            </code>{" "}
            returns a TanStack table with the URL, the filter and the layout
            wired in. The components only need that table.
          </p>
          <ul className="mt-2 flex flex-col gap-3 text-sm">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="min-w-0 [&_figure]:my-0 [&_figure]:bg-background [&_figure]:shadow-xl [&_figure]:shadow-sky-950/5">
          {code}
        </div>
      </div>
    </section>
  )
}
