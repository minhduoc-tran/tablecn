import { defineConfig, defineDocs } from "fumadocs-mdx/config"
import convert from "npm-to-yarn"

// MDX docs collection, read from `content/docs`
export const docs = defineDocs({
  dir: "content/docs",
})

/** Converts every line of an npm command to the target package manager */
function convertLines(command: string, to: "pnpm" | "yarn" | "bun") {
  return command
    .split("\n")
    .map((line) => convert(line, to))
    .join("\n")
}

export default defineConfig({
  mdxOptions: {
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
