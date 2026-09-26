"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/** Radix UI / Base UI / React Aria buttons over the install command of the picked one. */
export function InstallStylePicker({
  styles,
  className,
}: {
  styles: { value: string; label: string; command: React.ReactNode }[]
  className?: string
}) {
  const [picked, setPicked] = React.useState(styles[0]!.value)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        role="group"
        aria-label="Your shadcn/ui primitives"
        className="flex flex-wrap items-center justify-center gap-1 text-sm"
      >
        {styles.map((style) => (
          <button
            key={style.value}
            type="button"
            aria-pressed={picked === style.value}
            onClick={() => setPicked(style.value)}
            className="rounded-md border border-transparent px-2.5 py-1 text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-foreground/15 aria-pressed:bg-background aria-pressed:text-foreground"
          >
            {style.label}
          </button>
        ))}
      </div>
      {styles.find((style) => style.value === picked)?.command}
    </div>
  )
}
