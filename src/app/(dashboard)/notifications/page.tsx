import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserNotifications } from "@/db/queries/notifications"
import { runNotificationsScan } from "@/lib/notifications"
import NotificationsPage from "@/components/web/NotificationsPage"

export const instant = false

export default async function NotificationsPageRoute() {
  const session = await auth.api.getSession({ headers: await headers() })

  let notifications: Awaited<ReturnType<typeof getUserNotifications>> = []
  if (session) {
    try {
      await runNotificationsScan(session.user.id)
    } catch (error) {
      console.error("Error running notifications scan:", error)
    }
    notifications = await getUserNotifications(session.user.id, 100)
  }

  return <NotificationsPage notifications={notifications} />
}