"use client"

import * as React from "react"
import { useCardView, type DataTableView } from "@querycn/table-react"
import { MonitorIcon, SmartphoneIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

const PreviewViewContext = React.createContext<DataTableView>("auto")

/** The view the reader picked above the demo, for `useDataTable({ view })`. */
export const usePreviewView = () => React.useContext(PreviewViewContext)

const DEVICES = [
  { view: "cards", label: "Phone", icon: SmartphoneIcon },
  { view: "table", label: "Desktop", icon: MonitorIcon },
] as const

/**
 * Phone and Desktop buttons over a demo. Phone narrows the demo to a phone's
 * width and shows cards: a narrow box alone wouldn't, `auto` reads the viewport.
 */
export function PreviewDevice({ children }: { children: React.ReactNode }) {
  const [view, setView] = React.useState<DataTableView>("auto")
  const cards = useCardView({ view })

  return (
    <PreviewViewContext value={view}>
      <div
        role="group"
        aria-label="Preview as"
        className="flex items-center justify-end gap-1 text-sm"
      >
        {DEVICES.map((device) => (
          <button
            key={device.view}
            type="button"
            aria-pressed={cards === (device.view === "cards")}
            onClick={() => setView(device.view)}
            className="flex items-center gap-1.5 rounded-md border border-transparent px-2.5 py-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-foreground/15 aria-pressed:bg-background aria-pressed:text-foreground"
          >
            <device.icon className="size-4" />
            {device.label}
          </button>
        ))}
      </div>
      <div
        className={cn(
          "flex flex-col gap-3",
          view === "cards" &&
            "mx-auto w-full max-w-[390px] rounded-[2rem] border-8 border-foreground/10 p-3"
        )}
      >
        {children}
      </div>
    </PreviewViewContext>
  )
}
