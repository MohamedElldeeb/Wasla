import * as React from "react"
import { cn } from "@/lib/utils"

// DESIGN.md 5 Inputs: 48px on mobile, 40px on desktop; label always visible above (see Field); focus ring comes from the global rule.
function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "transition-ui h-12 w-full min-w-0 rounded-control border border-border-strong bg-surface px-3 text-body text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger lg:h-10",
        className
      )}
      {...props}
    />
  )
}

export { Input }
