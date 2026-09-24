"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type * as PageTree from "fumadocs-core/page-tree"

import { cn } from "@workspace/ui/lib/utils"

interface SidebarGroup {
  label: string
  items: PageTree.Item[]
}

/**
 * Groups the Fumadocs page tree for the sidebar:
 * top-level pages go into "Sections", each folder becomes its own group.
 */
function getSidebarGroups(tree: PageTree.Root): SidebarGroup[] {
  const sections: SidebarGroup = { label: "Sections", items: [] }
  const groups: SidebarGroup[] = [sections]

  for (const node of tree.children) {
    if (node.type === "page") {
      sections.items.push(node)
    } else if (node.type === "folder") {
      const items = [
        ...(node.index ? [node.index] : []),
        ...node.children.filter((child): child is PageTree.Item => child.type === "page"),
      ]
      groups.push({ label: String(node.name), items })
    }
  }

  return groups.filter((group) => group.items.length > 0)
}

/** shadcn-style docs sidebar navigation, shared by desktop sidebar and mobile sheet */
export function DocsSidebarNav({
  tree,
  onNavigate,
}: {
  tree: PageTree.Root
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-6">
      {getSidebarGroups(tree).map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="text-muted-foreground px-2 py-1 text-xs font-medium">{group.label}</p>
          {group.items.map((item) => {
            const isActive = pathname === item.url

            return (
              <Link
                key={item.url}
                href={item.url}
                onClick={onNavigate}
                data-active={isActive}
                className={cn(
                  "hover:bg-accent/60 flex h-[30px] w-fit items-center rounded-lg px-2 text-[0.8rem] font-medium transition-colors",
                  "data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                )}
              >
                {item.name}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
