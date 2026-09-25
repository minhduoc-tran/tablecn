import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { TypeTable } from "fumadocs-ui/components/type-table"
import defaultMdxComponents from "fumadocs-ui/mdx"
import type { MDXComponents } from "mdx/types"

import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
  DocsPre,
} from "@/components/docs/mdx/docs-code-block"
import { Card, Cards } from "@/components/docs/mdx/docs-cards"
import { Mermaid } from "@/components/docs/mdx/docs-mermaid"

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    // Flat shadcn-style cards (no shadow, rounded-md)
    Card,
    Cards,
    // Flat code blocks + package manager tabs
    pre: DocsPre,
    CodeBlockTab,
    CodeBlockTabs,
    CodeBlockTabsList,
    CodeBlockTabsTrigger,
    Mermaid,
    Tab,
    Tabs,
    TypeTable,
    ...components,
  }
}
