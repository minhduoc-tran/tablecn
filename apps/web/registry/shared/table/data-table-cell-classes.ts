// Opaque, so scrolled cells don't show through; the row's hover and selection
// colors are mixed in. Edge columns fade a shadow over the cells scrolled under them.
export const pinnedCellClassName = [
  "data-pinned:z-10 data-pinned:bg-background group-hover/row:data-pinned:bg-[color-mix(in_oklab,var(--color-muted)_50%,var(--color-background))] group-data-[state=selected]/row:data-pinned:bg-muted",
  "before:pointer-events-none before:absolute before:inset-y-0 before:w-3 before:from-foreground/10 before:to-transparent before:opacity-0 before:transition-opacity",
  "data-[pinned-edge=start]:before:-end-3 data-[pinned-edge=start]:before:bg-linear-to-r group-data-[scroll-start]/data-table:data-[pinned-edge=start]:before:opacity-100 rtl:data-[pinned-edge=start]:before:bg-linear-to-l",
  "data-[pinned-edge=end]:before:-start-3 data-[pinned-edge=end]:before:bg-linear-to-l group-data-[scroll-end]/data-table:data-[pinned-edge=end]:before:opacity-100 rtl:data-[pinned-edge=end]:before:bg-linear-to-r",
].join(" ")

// A sticky header loses its row border to border-collapse, so each cell draws one.
export const headerCellClassName =
  "relative bg-background after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border"
