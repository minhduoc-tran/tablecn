import type { ParamKind } from "@/components/home/url-tokens"

export interface Point {
  x: number
  y: number
}

export interface CalloutDef {
  id: string
  label: string
  hint: string
  side: "left" | "right"
  /** Colors the dot like the URL param it writes, as in the legend. */
  kind?: ParamKind
  /** Where the line ends, in viewport coordinates; `null` hides the callout. */
  target: (demo: HTMLElement) => Point | null
}

const TABLE = "[data-slot=data-table]"

function rectOf(demo: HTMLElement, selector: string) {
  return demo.querySelector(selector)?.getBoundingClientRect() ?? null
}

/** Skips controls hidden at this width, like the last-page button. */
function lastVisible(demo: HTMLElement, selector: string) {
  const rects = [...demo.querySelectorAll(selector)].map((el) =>
    el.getBoundingClientRect()
  )
  return rects.reverse().find((r) => r.width > 0) ?? null
}

const middle = (r: DOMRect) => r.top + r.height / 2

// Each target sits at the edge of the table or the toolbar, so a straight
// line from the side reaches it without crossing any text.
export const CALLOUTS: CalloutDef[] = [
  {
    id: "search",
    label: "Search",
    hint: "ignores case and accents",
    side: "left",
    kind: "search",
    target: (demo) => {
      const r = rectOf(demo, "[data-slot=data-table-search]")
      return r && { x: r.left, y: middle(r) }
    },
  },
  {
    id: "select",
    label: "Select rows",
    hint: "then act on them",
    side: "left",
    // On the table's edge, level with the header checkbox: a dot on the
    // checkbox itself would cover it.
    target: (demo) => {
      const table = rectOf(demo, TABLE)
      const checkbox = rectOf(demo, "thead [role=checkbox]")
      return table && checkbox ? { x: table.left, y: middle(checkbox) } : null
    },
  },
  {
    id: "pin",
    label: "Pinned column",
    hint: "stays put as you scroll",
    side: "left",
    // On the bottom border of the second row in view, so the line runs along
    // the grid, and follows when the rows scroll.
    target: (demo) => {
      const header = rectOf(demo, `${TABLE} thead`)
      const table = rectOf(demo, TABLE)
      if (!header || !table) return null
      const cells = [
        ...demo.querySelectorAll(
          "tbody td[data-pinned=start]:not([data-column-id=select])"
        ),
      ].map((cell) => cell.getBoundingClientRect())
      const r = cells.filter(
        (cell) => cell.top >= header.bottom - 1 && cell.bottom < table.bottom
      )[1]
      return r ? { x: r.left, y: r.bottom } : null
    },
  },
  {
    id: "columns",
    label: "Columns",
    hint: "show, hide and reorder",
    side: "right",
    target: (demo) => {
      const r = lastVisible(
        demo,
        "[data-slot=data-table-toolbar] [aria-haspopup]"
      )
      return r && { x: r.right, y: middle(r) }
    },
  },
  {
    id: "headers",
    label: "Headers",
    hint: "click to sort, drag to move, right-click for more",
    side: "right",
    kind: "sort",
    target: (demo) => {
      const table = rectOf(demo, TABLE)
      const header = rectOf(demo, `${TABLE} thead tr`)
      return table && header ? { x: table.right, y: middle(header) } : null
    },
  },
  {
    id: "pages",
    label: "Pages",
    hint: "kept in the URL",
    side: "right",
    kind: "page",
    target: (demo) => {
      const r = lastVisible(demo, "[data-slot=data-table-pagination] button")
      return r && { x: r.right, y: middle(r) }
    },
  },
]
