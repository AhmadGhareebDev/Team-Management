import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors a `MemberRow`: size-8 avatar, a two-line name/username block, and the
 * role control on the right. Inside the same `border-0` card shell the real list
 * renders into, so the divider lines line up.
 */
export function MemberRowSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3" aria-hidden>
      <Skeleton className="size-8! shrink-0 rounded-full" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Reserves the same width the role dropdown occupies, so wrapping
            matches whether or not the current user is a manager. */}
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  )
}

export function MemberListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col divide-y divide-border/40" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <MemberRowSkeleton key={i} />
      ))}
    </div>
  )
}