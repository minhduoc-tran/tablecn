import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
  // The `@tablecn` registry URL is `/r/{style}/{name}.json`, and the shadcn CLI
  // fills `{style}` from components.json (`radix-nova`, `base-nova`…). Each
  // style reads its primitive library's build; any other style gets Radix.
  async rewrites() {
    return [
      { source: "/r/:style(base-[^/]+)/:name", destination: "/r/base/:name" },
      { source: "/r/:style(aria-[^/]+)/:name", destination: "/r/aria/:name" },
      { source: "/r/:style/:name", destination: "/r/radix/:name" },
    ]
  },
}

const withMDX = createMDX()

export default withMDX(nextConfig)
