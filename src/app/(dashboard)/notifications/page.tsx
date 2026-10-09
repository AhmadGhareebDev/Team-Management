import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getUserNotifications,
  getUserNotificationCounts,
  type NotificationTab,
} from "@/db/queries/notifications"
import { runNotificationsScan } from "@/lib/notifications"
import NotificationsPage from "@/components/web/NotificationsPage"
import { PAGE_SIZES } from "@/lib/pagination"

export const instant = false

export default async function NotificationsPageRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  const params = await searchParams

  const requested = Array.isArray(params.tab) ? params.tab[0] : params.tab
  const tab: NotificationTab =
    requested === "tasks" || requested === "members" ? requested : "invitations"

  let notifications: Awaited<ReturnType<typeof getUserNotifications>> = {
    items: [],
    total: 0,
  }
  let counts: Record<NotificationTab, number> = {
    invitations: 0,
    tasks: 0,
    members: 0,
  }

  if (session) {
    try {
      await runNotificationsScan(session.user.id)
    } catch (error) {
      console.error("Error running notifications scan:", error)
    }

    const [result, countResult] = await Promise.all([
      getUserNotifications(session.user.id, {
        tab,
        limit: PAGE_SIZES.notificationsPage,
      }),
      getUserNotificationCounts(session.user.id),
    ])

    notifications = result
    counts = countResult.total
  }

  return (
    <NotificationsPage
      initialNotifications={notifications.items}
      initialTotal={notifications.total}
      initialTab={tab}
      counts={counts}
    />
  )
}