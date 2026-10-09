import MyTasksList from "./_components/MyTasksList"
import ActivityFeed from "./_components/ActivityFeed"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { getRecentActivityForUser } from "@/db/queries/activity"
import { PAGE_SIZES } from "@/lib/pagination"

export const instant = false

export default async function MyTasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  const activity = session
    ? await getRecentActivityForUser(session.user.id, {
        limit: PAGE_SIZES.activity,
      })
    : { items: [], total: 0 }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/40 pb-4">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
          My Tasks
        </h1>
      </div>

      <MyTasksList searchParams={await searchParams} />

      <ActivityFeed
        initialItems={activity.items}
        initialTotal={activity.total}
      />
    </div>
  )
}