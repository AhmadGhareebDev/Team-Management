import { cn } from "@/lib/utils"
import type { ProjectHealth } from "@/db/queries/stats"

export function ProjectHealthBadge({
  health,
  className,
}: {
  health: ProjectHealth
  className?: string
}) {
  const atRisk = health === "at_risk"

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        atRisk
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        className
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", atRisk ? "bg-destructive" : "bg-emerald-500")}
      />
      {atRisk ? "At risk" : "Healthy"}
    </span>
  )
}

export function ProjectProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number
  className?: string
  barClassName?: string
}) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all", barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  )
}
