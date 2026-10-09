import * as React from "react"
import { cn } from "@/lib/utils"

type Props = Omit<React.ComponentProps<"div">, "children"> & { value?: number; tone?: "primary" | "warning" | "danger" }

// Live progress animates smoothly (transform only); the bar turns warning/danger by tone (cap counter at 80 % / 100 %).
function Progress({ className, value = 0, tone = "primary", ...props }: Props) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v)}
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-surface-muted", className)}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-y-0 start-0 w-full origin-[left] rounded-full transition-transform duration-200 ease-ui rtl:origin-[right]",
          tone === "primary" && "bg-primary",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger"
        )}
        style={{ transform: `scaleX(${v / 100})` }}
      />
    </div>
  )
}

export { Progress }
