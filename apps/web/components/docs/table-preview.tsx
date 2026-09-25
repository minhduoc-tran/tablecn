"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"

import { OrdersDemo, OrdersDemoProvider } from "@/components/docs/orders-demo"

function PageUrl() {
  const search = useSearchParams().toString()
  return (
    <dl className="font-mono text-xs">
      <dt className="text-muted-foreground">URL</dt>
      <dd className="break-all">{search ? `?${search}` : "(empty)"}</dd>
    </dl>
  )
}

/** Live table for the docs, with the page's query string under it. */
export function TablePreview() {
  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4">
      {/* `useSearchParams` on a prerendered page needs a Suspense boundary */}
      <React.Suspense fallback={<div className="h-[560px]" />}>
        <OrdersDemoProvider>
          <OrdersDemo />
          <PageUrl />
        </OrdersDemoProvider>
      </React.Suspense>
    </div>
  )
}
