"use client"

import { useActiveAnchor } from "fumadocs-core/toc"
import type { TOCItemType } from "fumadocs-core/toc"

import { cn } from "@workspace/ui/lib/utils"

/**
 * shadcn-style "On This Page" table of contents.
 * Must be rendered inside fumadocs-core's `AnchorProvider` to track the active heading.
 */
export function DocsTableOfContents({ toc }: { toc: TOCItemType[] }) {
  const activeAnchor = useActiveAnchor()

  if (toc.length === 0) return null

  return (
    <div className="flex flex-col gap-2 ps-4">
      <p className="text-muted-foreground mb-1 text-xs">On This Page</p>
      {toc.map((item) => (
        <a
          key={item.url}
          href={item.url}
          data-active={activeAnchor === item.url.slice(1)}
          className={cn(
            "text-muted-foreground hover:text-foreground text-[0.8rem] no-underline transition-colors",
            "data-[active=true]:text-foreground",
            item.depth >= 3 && "ps-4",
            item.depth >= 4 && "ps-8"
          )}
        >
          {item.title}
        </a>
      ))}
    </div>
  )
}
