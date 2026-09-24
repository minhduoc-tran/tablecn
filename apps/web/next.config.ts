import type { NextConfig } from "next"
import { createMDX } from "fumadocs-mdx/next"

const nextConfig: NextConfig = {
  transpilePackages: ["@workspace/ui"],
}

const withMDX = createMDX()

export default withMDX(nextConfig)
