"use client"

import * as React from "react"
import { LockIcon } from "lucide-react"
import { useSearchParams } from "next/navigation"

import { OrdersDemo, OrdersDemoProvider } from "@/components/docs/orders-demo"
import { HomeDemoCallouts } from "@/components/home/home-demo-callouts"
import { PARAM_COLORS, UrlTokens } from "@/components/home/url-tokens"

const LEGEND = [
  { kind: "search", label: "q", hint: "search box" },
  { kind: "filter", label: "filter", hint: "Filter button and chips" },
  { kind: "sort", label: "sort", hint: "click a header" },
  { kind: "page", label: "page", hint: "pagination" },
] as const

function AddressBar() {
  const search = useSearchParams().toString()
  return (
    <div className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md bg-muted/70 px-3 text-xs">
      <LockIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 truncate">
        <span className="text-muted-foreground">
          table-cn.vercel.app/orders
        </span>
        <UrlTokens search={search} />
      </div>
    </div>
  )
}

/** The live table in a browser window whose address bar is this page's URL. */
export function HomeDemo() {
  const windowRef = React.useRef<HTMLDivElement>(null)
  return (
    <section
      id="demo"
      className="relative mx-auto w-full max-w-4xl scroll-mt-20 px-4"
    >
      {/* Outside the Suspense boundary, so the callouts have it from the start. */}
      <div ref={windowRef}>
        <React.Suspense
          fallback={<div className="h-[640px] rounded-xl border bg-muted/20" />}
        >
          <OrdersDemoProvider>
            <div className="overflow-hidden rounded-xl border bg-background shadow-2xl ring-1 shadow-sky-950/10 ring-foreground/5 dark:shadow-black/40">
              <div className="flex items-center gap-3 border-b bg-muted/30 px-3 py-2">
                <div className="hidden gap-1.5 sm:flex" aria-hidden>
                  <span className="size-3 rounded-full bg-red-400/80" />
                  <span className="size-3 rounded-full bg-amber-400/80" />
                  <span className="size-3 rounded-full bg-emerald-400/80" />
                </div>
                <AddressBar />
              </div>
              <div className="flex flex-col gap-3 p-4">
                <OrdersDemo />
              </div>
            </div>
          </OrdersDemoProvider>
        </React.Suspense>
      </div>
      <HomeDemoCallouts demoRef={windowRef} />
      <ul className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {LEGEND.map(({ kind, label, hint }) => (
          <li key={kind} className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${PARAM_COLORS[kind].dot}`} />
            <span className={`font-mono ${PARAM_COLORS[kind].text}`}>
              {label}
            </span>
            {hint}
          </li>
        ))}
      </ul>
    </section>
  )
}
