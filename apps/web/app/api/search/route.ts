import { createFromSource } from "fumadocs-core/search/server"

import { source } from "@/lib/source"

// Search endpoint used by the Fumadocs search dialog (Cmd/Ctrl + K)
export const { GET } = createFromSource(source)
