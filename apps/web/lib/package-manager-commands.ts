import convert from "npm-to-yarn"

/** The package managers shown as tabs, in order; the first is the default. */
export const packageManagers = ["pnpm", "npm", "yarn", "bun"] as const
export type PackageManager = (typeof packageManagers)[number]

/** Converts every line of an npm command to the target package manager */
export function convertLines(command: string, to: PackageManager) {
  if (to === "npm") return command
  return command
    .split("\n")
    .map((line) => convert(line, to))
    .join("\n")
}
