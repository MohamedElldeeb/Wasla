import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"

// Inline alerts: soft background, icon, one sentence (DESIGN.md 5 Feedback).
const alertVariants = cva("flex w-full items-start gap-3 rounded-card border p-3 text-body-sm", {
  variants: {
    variant: {
      info: "border-transparent bg-info-soft text-info",
      success: "border-transparent bg-success-soft text-success",
      warning: "border-transparent bg-warning-soft text-warning",
      danger: "border-transparent bg-danger-soft text-danger",
    },
  },
  defaultVariants: { variant: "info" },
})

const icons = { info: Info, success: CheckCircle2, warning: AlertTriangle, danger: XCircle }

function Alert({ className, variant = "info", children, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  const Icon = icons[variant ?? "info"]
  return (
    <div data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

export { Alert }
