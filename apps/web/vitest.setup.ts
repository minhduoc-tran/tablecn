import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

afterEach(cleanup)

// jsdom lacks the layout and pointer APIs the popover and select primitives call.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub
Element.prototype.scrollIntoView ??= function () {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= function () {}
globalThis.CSS ??= {} as typeof CSS
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (c) => `\\${c}`)
// Base UI's checkbox dispatches pointer events.
globalThis.PointerEvent ??= class PointerEvent extends MouseEvent {
  pointerId = 1
  pointerType = "mouse"
} as unknown as typeof globalThis.PointerEvent
