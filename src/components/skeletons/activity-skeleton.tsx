import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors one `ActivityFeed` row: size-7 icon, a two-line sentence, and the
 * timestamp on the right.
 */
export function ActivityRowSkeleton() {
  return (
    <li className="flex items-start gap-3 px-4 py-3" aria-hidden>
      <Skeleton className="mt-0.5 size-7 shrink-0" />

      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>

      <Skeleton className="mt-1 h-3 w-12 shrink-0" />
    </li>
  )
}

export function ActivityFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <section className="rounded-none border-0 bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>

      <ul className="divide-y divide-border/40">
        {Array.from({ length: rows }).map((_, i) => (
          <ActivityRowSkeleton key={i} />
        ))}
      </ul>
    </section>
  )
}