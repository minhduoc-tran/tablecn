import {
  rehypeCodeDefaultOptions,
  remarkMdxMermaid,
} from "fumadocs-core/mdx-plugins"
import { defineConfig, defineDocs } from "fumadocs-mdx/config"

import { convertLines } from "./lib/package-manager-commands"
import { siteConfig } from "./lib/site-config"

// MDX docs collection, read from `content/docs`
export const docs = defineDocs({
  dir: "content/docs",
})

/** `%SITE_URL%` in code becomes the deployed origin, so install commands work as copied */
function remarkSiteUrl() {
  type Node = { type: string; value?: string; children?: Node[] }
  const walk = (node: Node) => {
    if ((node.type === "code" || node.type === "inlineCode") && node.value) {
      node.value = node.value.replaceAll("%SITE_URL%", siteConfig.url)
    }
    node.children?.forEach(walk)
  }
  return walk
}

export default defineConfig({
  mdxOptions: {
    // `code{:ts}` in text is highlighted like a code block
    rehypeCodeOptions: {
      ...rehypeCodeDefaultOptions,
      inline: "tailing-curly-colon",
    },
    // First, so the npm tabs below are generated from the replaced command
    // ```mermaid code blocks become <Mermaid chart="…" />
    remarkPlugins: (plugins) => [remarkSiteUrl, remarkMdxMermaid, ...plugins],
    // ```npm code blocks become pnpm / npm / yarn / bun tabs
    remarkNpmOptions: {
      persist: { id: "package-manager" },
      packageManagers: [
        { name: "pnpm", command: (cmd) => convertLines(cmd, "pnpm") },
        { name: "npm", command: (cmd) => cmd },
        { name: "yarn", command: (cmd) => convertLines(cmd, "yarn") },
        { name: "bun", command: (cmd) => convertLines(cmd, "bun") },
      ],
    },
  },
})
