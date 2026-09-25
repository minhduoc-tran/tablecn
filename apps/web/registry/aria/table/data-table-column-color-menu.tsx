"use client"

import * as React from "react"
import type { DataTableInstance, TableMessages } from "@querycn/table-react"
import { PaletteIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
} from "@/registry/aria/ui/dropdown-menu"
import {
  columnColorPresets,
  isColumnColorPreset,
  resolveColumnColor,
} from "@/registry/shared/table/column-color-palette"

type Column<TData extends object> = ReturnType<
  DataTableInstance<TData>["getAllLeafColumns"]
>[number]

const NONE = "none"
const CUSTOM = "custom"

/** A swatch of a stored column color; an empty ring for none. */
export function ColorSwatch({ color }: { color?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-3.5 shrink-0 rounded-full",
        color ? "ring-1 ring-foreground/10" : "ring-1 ring-border ring-inset"
      )}
      style={{ backgroundColor: resolveColumnColor(color) }}
    />
  )
}

/** A "Color" submenu: no color, the presets, a custom color already set, and "Custom color…". */
export function DataTableColumnColorMenu<TData extends object>({
  column,
  messages,
  onCustomColor,
}: {
  column: Column<TData>
  messages: TableMessages
  /** Opens a color picker, e.g. `useCustomColorInput`'s `open`. */
  onCustomColor: () => void
}) {
  const color = column.getColor()
  const custom = color !== undefined && !isColumnColorPreset(color)
  return (
    <DropdownMenuSub>
      <DropdownMenuItem textValue={messages.columns.color}>
        <PaletteIcon />
        {messages.columns.color}
      </DropdownMenuItem>
      <DropdownMenuSubContent>
        <DropdownMenuGroup
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[color ?? NONE]}
          onSelectionChange={(keys) => {
            if (keys === "all") return
            const [key] = keys
            if (key !== undefined) {
              column.setColor(key === NONE ? undefined : String(key))
            }
          }}
        >
          <DropdownMenuItem id={NONE} textValue={messages.columns.noColor}>
            <ColorSwatch />
            {messages.columns.noColor}
          </DropdownMenuItem>
          {columnColorPresets.map((preset) => (
            <DropdownMenuItem
              key={preset}
              id={preset}
              textValue={messages.colors[preset]}
            >
              <ColorSwatch color={preset} />
              {messages.colors[preset]}
            </DropdownMenuItem>
          ))}
          {custom && (
            <DropdownMenuItem id={color} textValue={color}>
              <ColorSwatch color={color} />
              <span className="font-mono text-xs">{color}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem id={CUSTOM} onAction={onCustomColor}>
          {messages.columns.customColor}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}
