"use client"

import * as React from "react"

import { OrdersPage } from "@/components/docs/full-example/orders-table"
import { PageUrl } from "@/components/docs/table-preview"

export function FullExamplePreview() {
  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4">
      {/* `useSearchParams` on a prerendered page needs a Suspense boundary */}
      <React.Suspense fallback={<div className="h-[620px]" />}>
        <OrdersPage />
        <PageUrl />
      </React.Suspense>
    </div>
  )
}
