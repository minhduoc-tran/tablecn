"use client"

import * as React from "react"
import { cn } from "cn"
import {
  composeRenderProps,
  OverlayArrow,
  Tooltip as TooltipPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
  type TooltipProps,
  type TooltipTriggerComponentProps,
} from "react-aria-components"

/** React Aria has no provider: delays are set per `Tooltip`. Kept for the same markup as Radix and Base UI. */
function TooltipProvider({ children }: { children?: React.ReactNode }) {
  return <>{children}</>
}

/** Wraps a focusable trigger (e.g. `Button`) and its `TooltipContent`. */
function Tooltip({ delay = 0, ...props }: TooltipTriggerComponentProps) {
  return <TooltipTriggerPrimitive data-slot="tooltip" delay={delay} {...props} />
}

function TooltipContent({
  className,
  placement = "top",
  offset = 8,
  children,
  ...props
}: Omit<TooltipProps, "className"> & { className?: string }) {
  return (
    <TooltipPrimitive
      data-slot="tooltip-content"
      placement={placement}
      offset={offset}
      className={cn(
        "z-50 inline-flex w-fit max-w-xs origin-(--trigger-anchor-point) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement=bottom]:slide-in-from-top-2 data-[placement=left]:slide-in-from-right-2 data-[placement=right]:slide-in-from-left-2 data-[placement=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      {composeRenderProps(children, (children) => (
        <>
          {children}
          <OverlayArrow>
            <svg
              width={10}
              height={5}
              viewBox="0 0 10 5"
              className="fill-foreground [[data-placement=bottom]_&]:rotate-180 [[data-placement=left]_&]:-rotate-90 [[data-placement=right]_&]:rotate-90"
            >
              <path d="M0 0 L5 5 L10 0" />
            </svg>
          </OverlayArrow>
        </>
      ))}
    </TooltipPrimitive>
  )
}

export { Tooltip, TooltipContent, TooltipProvider }
