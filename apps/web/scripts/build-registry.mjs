import { execFileSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { execPath } from "node:process"
import { fileURLToPath } from "node:url"

// One source of truth: `registry.json` file paths use `{base}`, built once per primitive library.
// An item's `bases.<base>` adds dependencies only that library needs.
const BASES = ["radix", "base", "aria"]
const MERGED = ["dependencies", "registryDependencies"]

const root = fileURLToPath(new URL("..", import.meta.url))
const cli = fileURLToPath(import.meta.resolve("shadcn"))
const source = JSON.parse(readFileSync(`${root}/registry.json`, "utf8"))

function forBase(base) {
  const items = source.items.map(({ bases, ...item }) => {
    const extra = bases?.[base] ?? {}
    const merged = Object.fromEntries(
      MERGED.filter((key) => item[key] || extra[key]).map((key) => [
        key,
        [...(item[key] ?? []), ...(extra[key] ?? [])],
      ])
    )
    return {
      ...item,
      ...merged,
      files: item.files.map((file) => ({
        ...file,
        path: file.path.replace("{base}", base),
      })),
    }
  })
  return { ...source, items }
}

rmSync(`${root}/public/r`, { recursive: true, force: true })
for (const base of BASES) {
  // Kept next to registry.json: shadcn resolves `include` relative to the registry file.
  const file = `${root}/.registry-${base}.json`
  writeFileSync(file, JSON.stringify(forBase(base), null, 2))
  try {
    execFileSync(
      execPath,
      [
        cli,
        "build",
        file,
        "--cwd",
        root,
        "--output",
        `${root}/public/r/${base}`,
      ],
      { stdio: "inherit" }
    )
  } finally {
    rmSync(file, { force: true })
  }
}
