"use client"

import * as React from "react"
import { Direction } from "radix-ui"

import { OrdersDemo, OrdersDemoProvider } from "@/components/docs/orders-demo"
import { PageUrl } from "@/components/docs/table-preview"

/** The docs' orders table on a right-to-left page. */
export function RtlTablePreview() {
  return (
    <div
      dir="rtl"
      className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4"
    >
      {/* `useSearchParams` on a prerendered page needs a Suspense boundary */}
      <React.Suspense fallback={<div className="h-[560px]" />}>
        <Direction.Provider dir="rtl">
          <OrdersDemoProvider>
            <OrdersDemo dir="rtl" />
            <PageUrl />
          </OrdersDemoProvider>
        </Direction.Provider>
      </React.Suspense>
    </div>
  )
}
