// @vitest-environment node
import { renderToString } from "react-dom/server"
import { expect, it } from "vitest"

import { useBrowserUrlAdapter } from "./use-browser-url-adapter"

function Probe() {
  const adapter = useBrowserUrlAdapter()
  adapter.write("ignored")
  return <span>{adapter.read() ?? "none"}</span>
}

it("renders on the server without touching window", () => {
  expect(renderToString(<Probe />)).toBe("<span>none</span>")
})
