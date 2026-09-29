import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname)
const blockFolders = ["radix", "base", "aria"].flatMap((base) =>
  ["table", "filter"].map((block) => join(root, base, block))
)
const sharedFolders = ["table", "filter"].map((block) =>
  join(root, "shared", block)
)

const sources = [...blockFolders, ...sharedFolders].flatMap((folder) =>
  readdirSync(folder)
    .filter((file) => /\.tsx?$/.test(file) && !file.includes(".test."))
    .map((file) => join(folder, file))
)

describe("registry sources", () => {
  // shadcn's current styles use the `cn` package; `@/lib/utils` may not exist.
  it("import cn from the cn package", () => {
    const offenders = sources.filter((file) =>
      readFileSync(file, "utf8").includes('from "@/lib/utils"')
    )
    expect(offenders).toEqual([])
  })
})

interface RegistryItem {
  name: string
  files: { path: string }[]
}

describe("registry.json", () => {
  const { items } = JSON.parse(
    readFileSync(join(root, "..", "registry.json"), "utf8")
  ) as { items: RegistryItem[] }

  // A file a block imports but doesn't list would be missing after `shadcn add`.
  it.each(
    items.flatMap((item) =>
      ["radix", "base", "aria"].map((base) => [item.name, base] as const)
    )
  )("%s (%s) lists every file it imports", (name, base) => {
    const item = items.find((entry) => entry.name === name)!
    const listed = new Set(
      item.files.map((file) => file.path.replace("{base}", base))
    )
    const missing = [...listed].flatMap((path) =>
      [
        ...readFileSync(join(root, "..", path), "utf8").matchAll(
          /from "@\/registry\/((?:radix|base|aria|shared)\/(?:table|filter)\/[^"]+)"/g
        ),
      ]
        .map((match) => match[1]!)
        .filter(
          (target) =>
            ![".ts", ".tsx"].some((ext) =>
              listed.has(`registry/${target}${ext}`)
            )
        )
    )
    expect(missing).toEqual([])
  })
})
