import { Card, CardHeader, CardTitle, CardAction, CardFooter } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * Mirrors `WorkSpaceCard`: same card size, the same h-10 w-10 monogram block,
 * the truncated title, the role badge on the right and the footer line. Keeping
 * the structure identical is the point — the grid should not jump when the real
 * cards replace these.
 */
export function WorkSpaceCardSkeleton() {
  return (
    <Card size="sm" className="border-0 bg-card" aria-hidden>
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0" />
          <CardTitle className="min-w-0 flex-1">
            <Skeleton className="h-4 w-3/4" />
          </CardTitle>
          <CardAction className="static flex shrink-0 items-center">
            <Skeleton className="h-[18px] w-14" />
          </CardAction>
        </div>
      </CardHeader>

      <CardFooter className="flex items-center justify-between pt-0">
        <Skeleton className="h-3 w-32 text-[12px]" />
      </CardFooter>
    </Card>
  )
}

/** Three cards, matching the `sm:grid-cols-2 lg:grid-cols-3` grid in `WorkspacesList`. */
export function WorkSpacesGridSkeleton() {
  return (
    <div
      className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto scrollbar-thin sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <WorkSpaceCardSkeleton key={i} />
      ))}
    </div>
  )
}