"use client"

import * as React from "react"
import { cn } from "cn"
import {
  composeRenderProps,
  Header as HeaderPrimitive,
  Keyboard,
  Menu as MenuPrimitive,
  MenuItem as MenuItemPrimitive,
  MenuSection as MenuSectionPrimitive,
  MenuTrigger as MenuTriggerPrimitive,
  Popover as PopoverPrimitive,
  Separator as SeparatorPrimitive,
  SubmenuTrigger as SubmenuTriggerPrimitive,
  type MenuItemProps,
  type MenuProps,
  type MenuSectionProps,
  type MenuTriggerProps,
  type PopoverProps,
  type SubmenuTriggerProps,
} from "react-aria-components"
import { CheckIcon, ChevronRightIcon } from "lucide-react"

function DropdownMenu(props: MenuTriggerProps) {
  return <MenuTriggerPrimitive data-slot="dropdown-menu" {...props} />
}

type DropdownMenuContentProps<T> = MenuProps<T> &
  Pick<PopoverProps, "placement" | "offset" | "crossOffset"> & {
    popoverClassName?: string
  }

function DropdownMenuContent<T extends object>({
  className,
  popoverClassName,
  placement = "bottom start",
  offset = 4,
  crossOffset = 0,
  ...props
}: DropdownMenuContentProps<T>) {
  return (
    <PopoverPrimitive
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "z-50 min-w-32 origin-(--trigger-anchor-point) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
        popoverClassName
      )}
    >
      <MenuPrimitive
        data-slot="dropdown-menu-content"
        className={cn("outline-none", className)}
        {...props}
      />
    </PopoverPrimitive>
  )
}

function DropdownMenuGroup<T extends object>(props: MenuSectionProps<T>) {
  return <MenuSectionPrimitive data-slot="dropdown-menu-group" {...props} />
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof HeaderPrimitive> & { inset?: boolean }) {
  return (
    <HeaderPrimitive
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(
        "px-1.5 py-1 text-xs font-medium text-muted-foreground data-inset:pl-7",
        className
      )}
      {...props}
    />
  )
}

/**
 * In a menu or group with `selectionMode`, shows a check when selected, which
 * covers Radix and Base UI's checkbox and radio items. Pass `textValue` when
 * the children aren't a plain string (an icon and a label), for typeahead.
 */
function DropdownMenuItem<T extends object>({
  className,
  inset,
  variant = "default",
  children,
  ...props
}: MenuItemProps<T> & {
  inset?: boolean
  variant?: "default" | "destructive"
}) {
  return (
    <MenuItemPrimitive
      data-slot="dropdown-menu-item"
      data-inset={inset}
      data-variant={variant}
      textValue={typeof children === "string" ? children : undefined}
      className={composeRenderProps(className, (className, { selectionMode }) =>
        cn(
          "group/dropdown-menu-item relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-focused:bg-accent data-focused:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:data-focused:**:text-accent-foreground data-inset:pl-7 data-[variant=destructive]:text-destructive data-[variant=destructive]:data-focused:bg-destructive/10 data-[variant=destructive]:data-focused:text-destructive dark:data-[variant=destructive]:data-focused:bg-destructive/20 data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-[variant=destructive]:*:[svg]:text-destructive",
          selectionMode !== "none" && "pr-8",
          className
        )
      )}
      {...props}
    >
      {composeRenderProps(
        children,
        (children, { selectionMode, isSelected, hasSubmenu }) => (
          <>
            {children}
            {selectionMode !== "none" && (
              <span
                data-slot="dropdown-menu-item-indicator"
                className="pointer-events-none absolute right-2 flex items-center justify-center"
              >
                {isSelected && <CheckIcon />}
              </span>
            )}
            {hasSubmenu && <ChevronRightIcon className="ml-auto" />}
          </>
        )
      )}
    </MenuItemPrimitive>
  )
}

/** Wraps the item that opens the submenu, then its `DropdownMenuSubContent`. */
function DropdownMenuSub(props: SubmenuTriggerProps) {
  return <SubmenuTriggerPrimitive data-slot="dropdown-menu-sub" {...props} />
}

function DropdownMenuSubContent<T extends object>({
  placement = "end top",
  offset = 0,
  crossOffset = -3,
  ...props
}: DropdownMenuContentProps<T>) {
  return (
    <DropdownMenuContent
      data-slot="dropdown-menu-sub-content"
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive>) {
  return (
    <SeparatorPrimitive
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuShortcut({
  className,
  ...props
}: React.ComponentProps<typeof Keyboard>) {
  return (
    <Keyboard
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "ml-auto text-xs tracking-widest text-muted-foreground group-data-focused/dropdown-menu-item:text-accent-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
}
