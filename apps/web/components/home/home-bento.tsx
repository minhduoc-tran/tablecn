import { ChevronDownIcon, GripVerticalIcon, PinIcon, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { PARAM_COLORS } from "@/components/home/url-tokens"

function Cell({
  title,
  text,
  className,
  children,
}: {
  title: string
  text: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card",
        className
      )}
    >
      {/* Decorative: the real UI is in the demo above. */}
      <div
        aria-hidden
        className="relative flex min-h-44 flex-1 items-center justify-center overflow-hidden border-b bg-muted/30 p-6 select-none"
      >
        {children}
      </div>
      <div className="flex flex-col gap-1.5 p-6">
        <h3 className="font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  )
}

function Select({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-8 items-center justify-between gap-2 rounded-md border bg-background px-2.5 text-xs shadow-xs">
      {children}
      <ChevronDownIcon className="size-3 text-muted-foreground" />
    </span>
  )
}

function FilterIllustration() {
  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-xl border bg-background p-3 shadow-lg transition-transform duration-500 group-hover:-translate-y-1">
      <div className="grid grid-cols-[3rem_1fr_1fr_1.2fr] items-center gap-2 text-xs">
        <span className="text-muted-foreground">Where</span>
        <Select>Status</Select>
        <Select>is</Select>
        <Select>Paid</Select>
      </div>
      <div className="grid grid-cols-[3rem_1fr_1fr_1.2fr] items-center gap-2 text-xs">
        <Select>and</Select>
        <Select>Amount</Select>
        <Select>between</Select>
        <span className="flex h-8 items-center gap-1 rounded-md border bg-background px-2 tabular-nums shadow-xs">
          10 <span className="text-muted-foreground">–</span> 50
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between border-t pt-2">
        <div className="flex gap-1.5">
          {["Status is Paid", "Amount 10–50"].map((chip) => (
            <span
              key={chip}
              className="inline-flex h-6 items-center gap-1 rounded-md border bg-muted/50 ps-2 pe-1 text-[11px]"
            >
              {chip}
              <XIcon className="size-3 text-muted-foreground" />
            </span>
          ))}
        </div>
        <span className="rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background">
          Apply
        </span>
      </div>
    </div>
  )
}

function UrlIllustration() {
  const parts = [
    ["status__eq=paid", "filter"],
    ["sort=-amount", "sort"],
    ["page=2", "page"],
  ] as const
  return (
    <div className="flex w-full flex-col gap-2 font-mono text-xs">
      {parts.map(([param, kind], index) => (
        <div
          key={param}
          className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 shadow-xs transition-transform duration-500 group-hover:translate-x-1"
          style={{ transitionDelay: `${index * 60}ms` }}
        >
          <span className={PARAM_COLORS[kind].text}>
            {index === 0 ? "?" : "&"}
            {param}
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className={cn("size-1.5 rounded-full", PARAM_COLORS[kind].dot)}
            />
            {kind}
          </span>
        </div>
      ))}
    </div>
  )
}

function LayoutIllustration() {
  const columns = [
    { name: "Order", pinned: true, width: "w-20" },
    { name: "Customer", width: "w-28", dragging: true },
    { name: "Amount", width: "w-20", tint: true },
  ]
  return (
    <div className="flex overflow-hidden rounded-lg border bg-background text-xs shadow-sm">
      {columns.map((column) => (
        <div
          key={column.name}
          className={cn(
            "flex flex-col",
            column.width,
            column.pinned && "shadow-[4px_0_6px_-4px_rgb(0_0_0/0.25)]",
            column.tint && "bg-emerald-500/10",
            column.dragging &&
              "z-10 -translate-y-1 rotate-2 rounded-md border bg-background shadow-lg transition-transform duration-500 group-hover:translate-x-3"
          )}
        >
          <span className="flex h-8 items-center gap-1 border-b px-2 font-medium">
            {column.dragging && (
              <GripVerticalIcon className="size-3 text-muted-foreground" />
            )}
            {column.name}
            {column.pinned && (
              <PinIcon className="ms-auto size-3 text-muted-foreground" />
            )}
          </span>
          {[0, 1, 2].map((row) => (
            <span
              key={row}
              className="flex h-7 items-center border-b px-2 last:border-b-0"
            >
              <span className="h-1.5 w-3/4 rounded-full bg-muted-foreground/20" />
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

function ServerIllustration() {
  return (
    <div className="flex w-full flex-col gap-2 font-mono text-[11px]">
      <div className="rounded-lg border bg-background px-3 py-2 shadow-xs">
        <span className="text-violet-600 dark:text-violet-400">
          useTableQuery
        </span>
        <span className="text-muted-foreground">{"({ serializer })"}</span>
      </div>
      <div className="mx-auto h-4 w-px bg-border" />
      <div className="flex flex-col gap-1 rounded-lg border bg-background px-3 py-2 shadow-xs">
        <span>
          <span className="text-muted-foreground">GET </span>/api/orders
        </span>
        <span className="text-sky-600 dark:text-sky-400">?status=paid</span>
        <span className="text-violet-600 dark:text-violet-400">
          &amp;ordering=-amount
        </span>
        <span className="text-amber-600 dark:text-amber-400">
          &amp;page=2&amp;page_size=20
        </span>
      </div>
    </div>
  )
}

function VirtualIllustration() {
  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col">
        <span className="text-4xl font-semibold tracking-tight tabular-nums">
          10,000
        </span>
        <span className="text-xs text-muted-foreground">rows on the page</span>
      </div>
      <div className="flex flex-col">
        <span className="text-4xl font-semibold tracking-tight text-emerald-600 tabular-nums dark:text-emerald-400">
          ~30
        </span>
        <span className="text-xs text-muted-foreground">in the DOM</span>
      </div>
    </div>
  )
}

function FlavoursIllustration() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {["Radix UI", "Base UI", "React Aria"].map((name, index) => (
        <span
          key={name}
          className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium shadow-xs transition-transform duration-500 group-hover:-translate-y-1"
          style={{ transitionDelay: `${index * 60}ms` }}
        >
          {name}
        </span>
      ))}
      <span className="basis-full text-center font-mono text-[11px] text-muted-foreground">
        {"<DataTable table={table} />"}
      </span>
    </div>
  )
}

function AccessibleIllustration() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-1.5">
        {["Space", "↑", "↓", "Esc"].map((key) => (
          <kbd
            key={key}
            className="flex h-8 min-w-8 items-center justify-center rounded-md border border-b-2 bg-background px-2 font-mono text-xs shadow-xs"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground shadow-xs">
        “Column Amount moved to position 2 of 5.”
      </span>
    </div>
  )
}

export function HomeBento() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24">
      <div className="mb-12 flex flex-col items-center gap-3 text-center">
        <span className="text-sm font-medium text-muted-foreground">
          Features
        </span>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          Everything a list page needs, wired together
        </h2>
        <p className="max-w-xl text-muted-foreground">
          Tested, typed and accessible, so the next admin screen takes an
          afternoon instead of a sprint.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-6">
        <Cell
          className="md:col-span-4"
          title="A filter builder people understand"
          text="Where Status is Paid and Amount is between 10 and 50. Seven field types, fifteen operators, AND / OR, and options loaded as you type."
        >
          <FilterIllustration />
        </Cell>
        <Cell
          className="md:col-span-2"
          title="The URL is the state"
          text="Share a link, press back, reload: the same rows come back. A new filter goes to page 1 in the same navigation."
        >
          <UrlIllustration />
        </Cell>
        <Cell
          className="md:col-span-2"
          title="A layout users keep"
          text="Drag, pin, resize, hide and color columns. Saved in the browser and merged with the columns you ship later."
        >
          <LayoutIllustration />
        </Cell>
        <Cell
          className="md:col-span-2"
          title="Client or server data"
          text="Filter and sort in the browser, or send the URL to JSON:API, django-filter, PostgREST or your own backend."
        >
          <ServerIllustration />
        </Cell>
        <Cell
          className="md:col-span-2"
          title="Thousands of rows"
          text="Virtualization renders only the rows in view, with the sticky header and pinned columns intact."
        >
          <VirtualIllustration />
        </Cell>
        <Cell
          className="md:col-span-3"
          title="Three primitive libraries"
          text="Every block comes in Radix UI, Base UI and React Aria versions with the same props. Pick the one your project uses."
        >
          <FlavoursIllustration />
        </Cell>
        <Cell
          className="md:col-span-3"
          title="Keyboard and screen readers"
          text="Sort, move and resize columns from the keyboard, with every step announced. English and Vietnamese included."
        >
          <AccessibleIllustration />
        </Cell>
      </div>
    </section>
  )
}
