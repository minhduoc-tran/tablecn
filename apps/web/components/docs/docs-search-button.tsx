"use client"

import { SearchIcon } from "lucide-react"
import { useSearchContext } from "fumadocs-ui/contexts/search"

import { Button } from "@workspace/ui/components/button"

/** Header search trigger — opens the docs search dialog (also bound to ⌘K) */
export function DocsSearchButton() {
  const { setOpenSearch } = useSearchContext()

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => setOpenSearch(true)}
        className="bg-muted/50 text-muted-foreground hover:bg-muted relative hidden h-8 w-full justify-start rounded-lg pl-3 font-normal shadow-none md:flex md:w-48 lg:w-56 xl:w-64"
      >
        <span>Search documentation...</span>
        <span className="absolute top-1.5 right-1.5 flex gap-1">
          <kbd className="bg-background text-muted-foreground pointer-events-none flex h-5 items-center rounded border px-1 font-sans text-[0.7rem] font-medium select-none">
            ⌘
          </kbd>
          <kbd className="bg-background text-muted-foreground pointer-events-none flex h-5 items-center rounded border px-1 font-sans text-[0.7rem] font-medium select-none">
            K
          </kbd>
        </span>
      </Button>
      <Button variant="ghost" size="icon" className="size-8 md:hidden" onClick={() => setOpenSearch(true)}>
        <SearchIcon />
        <span className="sr-only">Search documentation</span>
      </Button>
    </>
  )
}
