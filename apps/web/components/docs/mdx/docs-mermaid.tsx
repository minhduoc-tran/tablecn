"use client"

import { use, useId, useSyncExternalStore } from "react"
import { useTheme } from "next-themes"

const cache = new Map<string, Promise<unknown>>()

function cachePromise<T>(key: string, create: () => Promise<T>): Promise<T> {
  const cached = cache.get(key)
  if (cached) return cached as Promise<T>
  const promise = create()
  cache.set(key, promise)
  return promise
}

/** ```mermaid code blocks, rendered in the browser (mermaid needs the DOM) and re-rendered on theme change */
export function Mermaid({ chart }: { chart: string }) {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )
  if (!isClient) return null
  return <MermaidContent chart={chart} />
}

function MermaidContent({ chart }: { chart: string }) {
  const id = useId()
  const { resolvedTheme } = useTheme()
  const { default: mermaid } = use(
    cachePromise("mermaid", () => import("mermaid"))
  )

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    fontFamily: "inherit",
    theme: resolvedTheme === "dark" ? "dark" : "neutral",
  })

  const { svg, bindFunctions } = use(
    cachePromise(`${chart}-${resolvedTheme}`, () =>
      mermaid.render(id, chart.replaceAll("\\n", "\n"))
    )
  )

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto rounded-md border border-foreground/15 bg-muted/30 p-4"
      ref={(container) => {
        if (container) bindFunctions?.(container)
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
