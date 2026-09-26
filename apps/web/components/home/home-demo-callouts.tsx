"use client"

import * as React from "react"
import { cn } from "@workspace/ui/lib/utils"

import {
  CALLOUTS,
  type CalloutDef,
  type Point,
} from "@/components/home/home-demo-callout-targets"
import { PARAM_COLORS } from "@/components/home/url-tokens"

/** How far a label sits outside the window, and where its line bends. */
const LABEL_OFFSET = 44
const BEND_OFFSET = 20
const SIDE_GAP = 30
// Rough width of a 13px character, to keep the top labels from overlapping.
const CHAR_WIDTH = 7

interface Placed {
  def: CalloutDef
  target: Point
  label: Point
  path: string
}

/** Pushes sorted positions `gaps[i]` apart, then back inside `max`. */
function spread(values: number[], gaps: number[], max: number) {
  const out = [...values]
  for (let i = 1; i < out.length; i++) {
    out[i] = Math.max(out[i]!, out[i - 1]! + gaps[i - 1]!)
  }
  const overflow = out.at(-1)! - max
  if (overflow > 0) {
    out[out.length - 1]! -= overflow
    for (let i = out.length - 2; i >= 0; i--) {
      out[i] = Math.min(out[i]!, out[i + 1]! - gaps[i]!)
    }
  }
  return out
}

function layout(demo: HTMLElement, overlay: HTMLElement): Placed[] {
  const origin = overlay.getBoundingClientRect()
  const box = demo.getBoundingClientRect()
  const left = box.left - origin.left
  const right = box.right - origin.left
  const top = box.top - origin.top

  const placed: Placed[] = []
  for (const side of ["left", "right", "top"] as const) {
    const items = CALLOUTS.filter((def) => def.side === side)
      .map((def) => ({ def, point: def.target(demo) }))
      .filter((item): item is { def: CalloutDef; point: Point } =>
        Boolean(item.point)
      )
      .map(({ def, point }) => ({
        def,
        target: { x: point.x - origin.left, y: point.y - origin.top },
      }))
    if (items.length === 0) continue

    if (side === "top") {
      items.sort((a, b) => a.target.x - b.target.x)
      const widths = items.map((item) => item.def.label.length * CHAR_WIDTH)
      const gaps = widths.slice(1).map((w, i) => (w + widths[i]!) / 2 + 20)
      const xs = spread(
        items.map((item) => item.target.x),
        gaps,
        right - widths.at(-1)! / 2
      )
      items.forEach((item, i) => {
        const x = xs[i]!
        const { target } = item
        placed.push({
          ...item,
          label: { x, y: top - LABEL_OFFSET },
          path: `M ${x} ${top - LABEL_OFFSET + 6} V ${top - BEND_OFFSET} H ${target.x} V ${target.y}`,
        })
      })
      continue
    }

    items.sort((a, b) => a.target.y - b.target.y)
    const ys = spread(
      items.map((item) => item.target.y),
      items.slice(1).map(() => SIDE_GAP),
      box.bottom - origin.top
    )
    const sign = side === "left" ? -1 : 1
    const edge = side === "left" ? left : right
    items.forEach((item, i) => {
      const y = ys[i]!
      const { target } = item
      placed.push({
        ...item,
        label: { x: edge + sign * LABEL_OFFSET, y },
        path: `M ${edge + sign * (LABEL_OFFSET - 6)} ${y} H ${edge + sign * BEND_OFFSET} V ${target.y} H ${target.x}`,
      })
    })
  }
  return placed
}

const LABEL_TRANSLATE = {
  left: "-translate-x-full -translate-y-1/2",
  right: "-translate-y-1/2",
  top: "-translate-x-1/2 -translate-y-full",
} as const

/**
 * Labels around the demo window with lines to the live controls they name.
 * They follow the table as it scrolls, resizes and moves columns; from `xl`
 * up, where there is room beside the window.
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
        setPlaced((prev) =>
          JSON.stringify(prev.map((p) => p.path)) ===
          JSON.stringify(next.map((p) => p.path))
            ? prev
            : next
        )
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
        {placed.map(({ def, path }) => (
          <path
            key={def.id}
            d={path}
            fill="none"
            strokeWidth={1}
            className="stroke-foreground/30"
          />
        ))}
      </svg>
      {placed.map(({ def, target, label }) => (
        <React.Fragment key={def.id}>
          <span
            className={cn(
              "absolute size-2 -translate-1/2 rounded-full ring-2 ring-background",
              def.kind ? PARAM_COLORS[def.kind].dot : "bg-foreground/60"
            )}
            style={{ left: target.x, top: target.y }}
          />
          <span
            className={cn(
              "absolute text-[13px] font-medium whitespace-nowrap text-foreground/80 underline decoration-foreground/25 underline-offset-4",
              LABEL_TRANSLATE[def.side]
            )}
            style={{ left: label.x, top: label.y }}
          >
            {def.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}
