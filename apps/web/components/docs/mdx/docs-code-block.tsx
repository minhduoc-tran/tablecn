import type { ComponentProps } from "react"
import { SquareTerminalIcon } from "lucide-react"
import {
  CodeBlock,
  CodeBlockTab,
  CodeBlockTabs as FumadocsCodeBlockTabs,
  CodeBlockTabsList as FumadocsCodeBlockTabsList,
  CodeBlockTabsTrigger as FumadocsCodeBlockTabsTrigger,
  Pre,
} from "fumadocs-ui/components/codeblock"

import { cn } from "@workspace/ui/lib/utils"

/** Flat code block: muted background, subtle border, no shadow */
export function DocsPre(props: Omit<ComponentProps<"pre">, "ref">) {
  return (
    <CodeBlock {...props} className={cn("bg-muted/60 border-foreground/15 rounded-md border shadow-none", props.className)}>
      <Pre>{props.children}</Pre>
    </CodeBlock>
  )
}

/**
 * Tabbed code block (used by remark-npm for pnpm / npm / yarn / bun).
 * Inner code blocks are flattened, and made `static` so their copy button
 * is positioned against this container — i.e. on the tabs row.
 */
export function CodeBlockTabs(props: ComponentProps<typeof FumadocsCodeBlockTabs>) {
  return (
    <FumadocsCodeBlockTabs
      {...props}
      className={cn(
        "bg-muted/40 border-foreground/15 relative overflow-hidden rounded-md border",
        "[&_figure]:static [&_figure]:m-0 [&_figure]:rounded-none [&_figure]:border-0 [&_figure]:bg-transparent [&_figure]:shadow-none",
        props.className
      )}
    />
  )
}

export function CodeBlockTabsList({
  children,
  ...props
}: ComponentProps<typeof FumadocsCodeBlockTabsList>) {
  return (
    <FumadocsCodeBlockTabsList
      {...props}
      // Darker header row so the tabs stand apart from the code area
      className={cn("bg-muted border-foreground/15 h-12 items-center gap-1 border-b px-3 pe-12", props.className)}
    >
      <SquareTerminalIcon aria-hidden className="text-foreground/80 me-1 size-5 shrink-0" />
      {children}
    </FumadocsCodeBlockTabsList>
  )
}

/** Pill-style trigger; hides Fumadocs' default underline indicator */
export function CodeBlockTabsTrigger(props: ComponentProps<typeof FumadocsCodeBlockTabsTrigger>) {
  return (
    <FumadocsCodeBlockTabsTrigger
      {...props}
      className={cn(
        "rounded-md border border-transparent px-2.5 py-1 font-mono text-sm font-normal [&>div:first-child]:hidden",
        "hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:border-foreground/15",
        props.className
      )}
    />
  )
}

export { CodeBlockTab }
