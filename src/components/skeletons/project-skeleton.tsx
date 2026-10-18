import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors `ProjectCard`: h-10 w-10 folder block, truncated title, the optional
 * menu button, a two-line description, the progress bar with its percentage and
 * health badge, then the member footer with avatars.
 */
export function ProjectCardSkeleton() {
  return (
    <Card size="sm" className="border-0 bg-card" aria-hidden>
      <CardContent className="flex flex-col gap-4 p-5">
        {/* Icon + title + actions */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <Skeleton className="min-w-0 flex-1 h-4" />
          <Skeleton className="size-7 shrink-0" />
        </div>

        {/* Description: line-clamp-2 in the real card */}
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-4/5" />
        </div>

        {/* Progress bar + percentage + health badge */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-2 flex-1 rounded-none" />
          <Skeleton className="h-3 w-8 shrink-0" />
          <Skeleton className="h-6 w-[68px] shrink-0 rounded-none" />
        </div>

        {/* Footer: member count + avatars */}
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Skeleton className="h-3 w-16" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-6! rounded-full" />
            <Skeleton className="size-6! -ml-1.5 rounded-full" />
            <Skeleton className="size-6! -ml-1.5 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Two cards, matching the `sm:grid-cols-2` grid in `ProjectsList`. */
export function ProjectsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: 2 }).map((_, i) => (
        <ProjectCardSkeleton key={i} />
      ))}
    </div>
  )
}