"use client"

import * as React from "react"
import { Button } from "@workspace/ui/components/button"

import { OrdersDemo, OrdersDemoProvider } from "@/components/docs/orders-demo"
import { PageUrl } from "@/components/docs/table-preview"

const WIDTHS = [
  { label: "Phone", width: "375px" },
  { label: "Tablet", width: "640px" },
  { label: "Full", width: "100%" },
]

/** The docs' orders table in a frame users can narrow, to see it turn into cards. */
export function ResponsiveTablePreview() {
  const [width, setWidth] = React.useState(WIDTHS[0]!.width)

  return (
    <div className="not-prose my-6 flex flex-col gap-3 rounded-lg border p-4">
      <div
        role="group"
        aria-label="Preview width"
        className="flex gap-1 self-start rounded-lg border p-0.5"
      >
        {WIDTHS.map((preset) => (
          <Button
            key={preset.label}
            size="sm"
            variant={preset.width === width ? "secondary" : "ghost"}
            aria-pressed={preset.width === width}
            onClick={() => setWidth(preset.width)}
          >
            {preset.label}
          </Button>
        ))}
      </div>
      {/* `resize-x`: drag the corner to try any width in between. */}
      <div
        className="flex max-w-full min-w-[300px] resize-x flex-col gap-3 overflow-hidden border-e border-dashed pe-3"
        style={{ width }}
      >
        {/* `useSearchParams` on a prerendered page needs a Suspense boundary */}
        <React.Suspense fallback={<div className="h-[560px]" />}>
          <OrdersDemoProvider>
            <OrdersDemo />
            <PageUrl />
          </OrdersDemoProvider>
        </React.Suspense>
      </div>
    </div>
  )
}
