import { Suspense } from "react"
import type { Metadata } from "next"
import { CreateWorkSpace } from "./_components/CreateWorkSpace"
import WorkspacesList from "./_components/WorkspacesList"
import { PageHeader } from "@/components/web/PageHeader"
import { WorkSpacesGridSkeleton } from "@/components/skeletons"
import { searchParamsKey } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "Workspaces",
}

export default async function WorkSpacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  // Remount the boundary when the query changes so the skeleton is visible
  // while the next page is fetched.
  const listKey = searchParamsKey(resolvedSearchParams)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Workspaces"
        description="Your teams and the projects they share."
        actions={<CreateWorkSpace />}
      />

      {/* The grid is the only part that waits on the database, so the heading
          and the create button paint immediately. */}
      <Suspense key={listKey} fallback={<WorkSpacesGridSkeleton />}>
        <WorkspacesList searchParams={resolvedSearchParams} />
      </Suspense>
    </div>
  )
}