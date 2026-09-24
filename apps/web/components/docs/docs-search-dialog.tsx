"use client"

import { Fragment } from "react"
import { useRouter } from "next/navigation"
import { FileTextIcon, HashIcon, TextIcon } from "lucide-react"
import { useDocsSearch } from "fumadocs-core/search/client"
import { fetchClient } from "fumadocs-core/search/client/fetch"
import type { SharedProps } from "fumadocs-ui/contexts/search"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"

const searchClient = fetchClient({ api: "/api/search" })

const resultIcons = {
  page: FileTextIcon,
  heading: HashIcon,
  text: TextIcon,
} as const

/**
 * Renders search result text, turning `<mark>` tags returned by the search
 * API into highlighted spans.
 */
function HighlightedContent({ content }: { content: string }) {
  const parts = content.split(/(<mark>.*?<\/mark>)/g)

  return (
    <span className="truncate">
      {parts.map((part, index) =>
        part.startsWith("<mark>") ? (
          <span key={index} className="text-primary font-medium">
            {part.slice(6, -7)}
          </span>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </span>
  )
}

/**
 * shadcn-style command palette for docs search (⌘K / Ctrl+K).
 * Registered as the `SearchDialog` of Fumadocs' RootProvider, which handles
 * the hotkey and open state.
 */
export function DocsSearchDialog({ open, onOpenChange }: SharedProps) {
  const router = useRouter()
  const { search, setSearch, query } = useDocsSearch({ client: searchClient })
  const results = Array.isArray(query.data) ? query.data : []

  function handleSelect(url: string) {
    onOpenChange(false)
    router.push(url)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search documentation"
      description="Search for a page or heading..."
    >
      {/* Results are filtered by the search API, not by cmdk */}
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search documentation..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>
            {query.isLoading
              ? "Searching..."
              : search
                ? "No results found."
                : "Type to search the docs."}
          </CommandEmpty>
          {results.length > 0 && (
            <CommandGroup heading="Results">
              {results.map((item) => {
                const Icon = resultIcons[item.type]

                return (
                  <CommandItem
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.url)}
                    className={item.type === "page" ? undefined : "ps-6"}
                  >
                    <Icon />
                    <HighlightedContent content={item.content} />
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
