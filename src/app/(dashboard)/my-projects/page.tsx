import { Suspense } from "react"
import type { Metadata } from "next"
import MyProjectsList from "./_components/MyProjectsList"
import { ProjectCardSkeleton } from "@/components/skeletons"
import { searchParamsKey } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "My Projects",
}

export default async function MyProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  // Remount the boundary when the query changes so the skeleton is visible
  // while the next page is fetched.
  const listKey = searchParamsKey(resolvedSearchParams)

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Projects
        </h1>
      </div>

      <Suspense
        key={listKey}
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <MyProjectsList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}