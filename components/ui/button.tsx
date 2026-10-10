import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

// DESIGN.md 5 Buttons: md 40px desktop / lg 48px (mobile default and main CTAs). Touch targets are 48px on mobile.
const buttonVariants = cva(
  "press transition-ui inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-transparent text-body-sm font-medium rtl:font-semibold disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5 [&[data-loading]>svg:not([data-spinner])]:hidden",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg hover:bg-primary/90 active:bg-primary/80",
        // Same orange as primary (DESIGN v2: one orange action per view). Kept as an alias for the send action.
        accent: "bg-primary text-primary-fg hover:bg-primary/90 active:bg-primary/80",
        secondary: "border-border-strong bg-transparent text-fg-body hover:bg-surface-hover active:bg-surface-hover",
        ghost: "text-fg-body hover:bg-surface-hover active:bg-surface-hover",
        "danger-outline": "border-danger bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        md: "h-12 px-4 lg:h-10 lg:py-2.5",
        lg: "h-12 px-5 text-body",
        icon: "size-12 p-0 lg:size-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
)

type Props = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { loading?: boolean }

function Button({ className, variant, size, loading, disabled, children, ...props }: Props) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-loading={loading ? "" : undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 data-spinner className="size-5 animate-spin" aria-hidden />}
      {children}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
