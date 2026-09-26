"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

import {
  CALLOUTS,
  type CalloutDef,
  type Point,
} from "@/components/home/home-demo-callout-targets"
import { PARAM_COLORS } from "@/components/home/url-tokens"

/** Gap between the window's edge and a label; the line fills it. */
const LABEL_OFFSET = 36

interface Placed {
  def: CalloutDef
  target: Point
  /** Where the label's inner edge meets the line. */
  start: Point
}

function layout(demo: HTMLElement, overlay: HTMLElement): Placed[] {
  const origin = overlay.getBoundingClientRect()
  const box = demo.getBoundingClientRect()
  return CALLOUTS.flatMap((def) => {
    const point = def.target(demo)
    if (!point) return []
    const y = point.y - origin.top
    const x =
      def.side === "left"
        ? box.left - origin.left - LABEL_OFFSET
        : box.right - origin.left + LABEL_OFFSET
    return [{ def, target: { x: point.x - origin.left, y }, start: { x, y } }]
  })
}

const samePlaces = (a: Placed[], b: Placed[]) =>
  a.length === b.length &&
  a.every(
    (p, i) =>
      p.def === b[i]!.def &&
      p.target.x === b[i]!.target.x &&
      p.target.y === b[i]!.target.y &&
      p.start.x === b[i]!.start.x
  )

/**
 * Labels beside the demo window, each with a straight line to the live
 * control it names. They follow the table as it scrolls, resizes and moves
 * columns. From `xl` up, where there is room beside the window.
 */
export function HomeDemoCallouts({
  demoRef,
}: {
  demoRef: React.RefObject<HTMLElement | null>
}) {
  const overlayRef = React.useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = React.useState<Placed[]>([])

  React.useEffect(() => {
    const demo = demoRef.current
    const overlay = overlayRef.current
    if (!demo || !overlay) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        // Hidden below `xl`: nothing to measure.
        const next = overlay.offsetParent ? layout(demo, overlay) : []
        setPlaced((prev) => (samePlaces(prev, next) ? prev : next))
      })
    }

    const resize = new ResizeObserver(update)
    resize.observe(demo)
    // Column moves, pins, resizes and new rows all change the demo's DOM.
    const mutation = new MutationObserver(update)
    mutation.observe(demo, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "data-pinned", "data-dragging"],
    })
    demo.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    update()

    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutation.disconnect()
      demo.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [demoRef])

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 hidden xl:block"
    >
      <svg className="absolute inset-0 size-full overflow-visible">
        {placed.map(({ def, target, start }) => (
          <line
            key={def.id}
            x1={start.x}
            y1={start.y}
            x2={target.x}
            y2={target.y}
            strokeWidth={1}
            className="stroke-foreground/25"
          />
        ))}
      </svg>
      {placed.map(({ def, target, start }) => (
        <React.Fragment key={def.id}>
          <span
            className={cn(
              "absolute size-2 -translate-1/2 rounded-full ring-2 ring-background",
              def.kind ? PARAM_COLORS[def.kind].dot : "bg-foreground/50"
            )}
            style={{ left: target.x, top: target.y }}
          />
          <span
            className={cn(
              // The line meets the title's middle; the hint hangs below.
              "absolute -mt-2.5 flex w-40 flex-col gap-0.5 px-2",
              def.side === "left" ? "-translate-x-full text-end" : "text-start"
            )}
            style={{ left: start.x, top: start.y }}
          >
            <span className="text-sm font-medium text-foreground">
              {def.label}
            </span>
            <span className="text-xs leading-snug text-balance text-muted-foreground">
              {def.hint}
            </span>
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}
