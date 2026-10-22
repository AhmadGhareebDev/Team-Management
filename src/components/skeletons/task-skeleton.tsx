import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors `UserTaskCard`: the absolute status accent strip on the left, the
 * workspace/project breadcrumb, the two badge rows, the clamped title and
 * description, and the footer with avatars.
 */
export function UserTaskCardSkeleton() {
  return (
    <Card size="sm" className="relative h-full overflow-hidden border-0 bg-card" aria-hidden>
      {/* Stands in for the statusLeftAccent strip */}
      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-muted" />

      <CardContent className="flex h-full flex-col gap-3 p-5 pl-6">
        {/* workspace / project */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-2" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* status + priority badges */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-5 w-16 rounded-none" />
          <Skeleton className="h-5 w-14 rounded-none" />
        </div>

        {/* title */}
        <Skeleton className="h-4 w-4/5" />

        {/* description */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-3/5" />
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1">
            <Skeleton className="size-6! rounded-full" />
            <Skeleton className="size-6! -ml-1.5 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Three cards, matching the `lg:grid-cols-3` grid in `MyTasksList`. */
export function TasksGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <UserTaskCardSkeleton key={i} />
      ))}
    </div>
  )
}