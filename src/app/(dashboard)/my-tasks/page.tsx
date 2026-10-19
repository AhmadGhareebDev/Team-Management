import { Suspense } from "react"
import type { Metadata } from "next"
import MyTasksList from "./_components/MyTasksList"
import ActivityFeed from "./_components/ActivityFeed"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getRecentActivityForUser } from "@/db/queries/activity"
import { TasksGridSkeleton, ActivityFeedSkeleton } from "@/components/skeletons"
import { PAGE_SIZES, searchParamsKey } from "@/lib/pagination"

export const metadata: Metadata = {
  title: "My Tasks",
}

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = await searchParams
  // Remount the boundary when the query changes so the skeleton is visible
  // while the next page is fetched.
  const listKey = searchParamsKey(resolvedSearchParams)

  return (
    <div className="flex flex-col gap-6 p-6 max-sm:p-0">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Tasks
        </h1>
      </div>

      <Suspense key={listKey} fallback={<TasksGridSkeleton />}>
        <MyTasksList searchParams={resolvedSearchParams} />
      </Suspense>

      {/* The activity query moves inside the boundary: it used to be awaited at
          the top of the page, which held up the task list behind it. */}
      <Suspense fallback={<ActivityFeedSkeleton rows={4} />}>
        <ActivityFeedSection />
      </Suspense>
    </div>
  )
}

async function ActivityFeedSection() {
  const session = await auth.api.getSession({ headers: await headers() })

  const activity = session
    ? await getRecentActivityForUser(session.user.id, {
        limit: PAGE_SIZES.activity,
      })
    : { items: [], total: 0 }

  return <ActivityFeed initialItems={activity.items} initialTotal={activity.total} />
}