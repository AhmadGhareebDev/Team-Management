import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"span"> & {
  size?: "sm" | "default"
}) {
  return (
    <span
      data-slot="badge"
      data-size={size}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md border font-semibold tracking-wider uppercase",
        "data-[size=default]:px-2 py-0.5 text-[10px] data-[size=sm]:px-1.5 py-px text-[9px]",
        className
      )}
      {...props}
    />
  )
}

export { Badge }