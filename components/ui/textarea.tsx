import * as React from "react"
import { cn } from "@/lib/utils"

// Message textareas: min 6 rows, auto-grow (field-sizing), count shown by the caller in the corner.
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "transition-ui field-sizing-content min-h-36 w-full rounded-control border border-border-strong bg-surface px-3 py-3 text-body text-fg outline-none placeholder:text-fg-subtle disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
