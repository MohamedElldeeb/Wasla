"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />
}

// Segmented control. On mobile it scrolls horizontally under the page header (DESIGN.md 6.5).
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full gap-1 overflow-x-auto rounded-control border border-border bg-surface p-1 [scrollbar-width:none]", className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "transition-ui inline-flex h-12 min-w-24 flex-1 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-control px-4 text-body-sm font-medium text-fg-muted hover:text-fg disabled:pointer-events-none disabled:opacity-50 data-active:bg-surface-hover data-active:text-fg data-active:ring-1 data-active:ring-border-strong lg:h-10",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return <TabsPrimitive.Panel data-slot="tabs-content" className={cn("flex-1", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
