"use client"

import { useTOCItems } from "fumadocs-ui/components/toc"
import { TOCItem, TOCItems } from "fumadocs-ui/components/toc/clerk"
import { TextAlignStartIcon } from "lucide-react"

/**
 * "On This Page" in Fumadocs' clerk style: a line that bends with the heading
 * levels, and a thumb over the headings in view. Colors stay the site's own:
 * muted items, the active ones in the foreground color.
 * Must be rendered inside fumadocs-ui's `TOCProvider`.
 */
export function DocsTableOfContents() {
  const toc = useTOCItems()

  if (toc.length === 0) return null

  return (
    <div className="flex flex-col gap-3 ps-4">
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TextAlignStartIcon aria-hidden className="size-3.5" />
        On This Page
      </p>
      {/* isolate: the items' track sits at z-index -1, behind them but not behind the page */}
      <TOCItems className="isolate [&_.stroke-fd-primary]:stroke-foreground">
        {toc.map((item) => (
          <TOCItem
            key={item.url}
            item={item}
            className="text-[0.8rem] leading-5 text-muted-foreground no-underline hover:text-foreground data-[active=true]:text-foreground"
          />
        ))}
      </TOCItems>
    </div>
  )
}
