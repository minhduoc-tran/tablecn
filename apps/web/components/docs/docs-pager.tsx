import Link from "next/link"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import type * as PageTree from "fumadocs-core/page-tree"

import { Button } from "@workspace/ui/components/button"

/** Previous/next pages, as returned by `findNeighbour` from fumadocs-core */
export interface DocsNeighbours {
  previous?: PageTree.Item
  next?: PageTree.Item
}

/** Compact arrow buttons shown next to the page title (like ui.shadcn.com) */
export function DocsPagerIconButtons({ neighbours }: { neighbours: DocsNeighbours }) {
  const { previous, next } = neighbours

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="icon" className="size-8" disabled={!previous} asChild={!!previous}>
        {previous ? (
          <Link href={previous.url}>
            <ArrowLeftIcon />
            <span className="sr-only">Previous page</span>
          </Link>
        ) : (
          <span>
            <ArrowLeftIcon />
            <span className="sr-only">Previous page</span>
          </span>
        )}
      </Button>
      <Button variant="secondary" size="icon" className="size-8" disabled={!next} asChild={!!next}>
        {next ? (
          <Link href={next.url}>
            <ArrowRightIcon />
            <span className="sr-only">Next page</span>
          </Link>
        ) : (
          <span>
            <ArrowRightIcon />
            <span className="sr-only">Next page</span>
          </span>
        )}
      </Button>
    </div>
  )
}

/** Labelled previous/next buttons at the bottom of the page */
export function DocsPagerFooter({ neighbours }: { neighbours: DocsNeighbours }) {
  const { previous, next } = neighbours
  if (!previous && !next) return null

  return (
    <div className="mt-12 flex items-center gap-2">
      {previous && (
        <Button variant="secondary" size="sm" asChild>
          <Link href={previous.url}>
            <ArrowLeftIcon />
            {previous.name}
          </Link>
        </Button>
      )}
      {next && (
        <Button variant="secondary" size="sm" className="ms-auto" asChild>
          <Link href={next.url}>
            {next.name}
            <ArrowRightIcon />
          </Link>
        </Button>
      )}
    </div>
  )
}
