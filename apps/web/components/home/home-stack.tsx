import { cn } from "@workspace/ui/lib/utils"

const LAYERS: {
  label: string
  note: string
  items: { name: string; text: string }[]
  owned?: boolean
}[] = [
  {
    label: "Your code",
    note: "copied by the shadcn CLI",
    owned: true,
    items: [
      {
        name: "filter-builder",
        text: "Filter button, panel, rule rows, chips",
      },
      {
        name: "data-table",
        text: "Table, headers, pagination, Columns menu, toolbar",
      },
    ],
  },
  {
    label: "React",
    note: "npm, headless",
    items: [
      {
        name: "@querycn/table-react",
        text: "useDataTable on TanStack Table v9",
      },
      { name: "@querycn/filter-next", text: "Next.js App Router adapter" },
      { name: "@querycn/filter-react", text: "Provider, hooks, URL adapters" },
    ],
  },
  {
    label: "Anywhere",
    note: "npm, no dependencies",
    items: [
      {
        name: "@querycn/filter-core",
        text: "Rules, URL codec, backend serializers",
      },
    ],
  },
]

export function HomeStack() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          Architecture
        </span>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Logic on npm, UI you own
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Update the logic like any dependency. Edit the components like your
          own code. Take only the layers you need: the filter works without the
          table, and its core works without React.
        </p>
      </div>
      <div className="mx-auto flex max-w-4xl flex-col gap-3">
        {LAYERS.map((layer) => (
          <div
            key={layer.label}
            className={cn(
              "grid gap-4 rounded-2xl border p-4 md:grid-cols-[10rem_1fr] md:items-center",
              layer.owned
                ? "border-sky-500/40 bg-linear-to-r from-sky-500/10 via-violet-500/5 to-transparent"
                : "bg-card"
            )}
          >
            <div className="flex flex-col px-2">
              <span className="font-medium">{layer.label}</span>
              <span className="text-xs text-muted-foreground">
                {layer.note}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(12rem,1fr))]">
              {layer.items.map((item) => (
                <div
                  key={item.name}
                  className="flex min-w-0 flex-col gap-1 rounded-xl border bg-background px-4 py-3 shadow-xs"
                >
                  <code className="truncate font-mono text-[0.8rem] font-medium">
                    {item.name}
                  </code>
                  <span className="text-xs text-muted-foreground">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
