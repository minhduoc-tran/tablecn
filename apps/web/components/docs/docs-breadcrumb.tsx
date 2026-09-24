import { Fragment } from "react"
import Link from "next/link"
import type { BreadcrumbItem as FumadocsBreadcrumbItem } from "fumadocs-core/breadcrumb"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"

/**
 * shadcn-style breadcrumb for docs pages.
 * Items are computed on the server via `getBreadcrumbItems` from fumadocs-core.
 * The last item is rendered as the current page.
 */
export function DocsBreadcrumb({ items }: { items: FumadocsBreadcrumbItem[] }) {
  if (items.length === 0) return null

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <Fragment key={index}>
              <BreadcrumbItem>
                {isLast || !item.url ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.url}>{item.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
