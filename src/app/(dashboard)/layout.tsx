import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./_components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Navbar } from "@/components/web/Navbar"
import { NotificationsProvider } from "@/components/web/NotificationsProvider"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getUserNotifications,
  getUserNotificationCounts,
  getDefaultNotificationTab,
  type NotificationTab,
} from "@/db/queries/notifications"
import { runNotificationsScan } from "@/lib/notifications"
import { PAGE_SIZES } from "@/lib/pagination"


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  let initialTab: NotificationTab = "invitations"
  let notifications: Awaited<ReturnType<typeof getUserNotifications>>["items"] = []
  let notificationTotal = 0
  let counts = { invitations: 0, tasks: 0, members: 0 }
  let unreadTotal = 0

  if (session) {
    try {
      await runNotificationsScan(session.user.id)
    } catch (error) {
      console.error("Error running notifications scan:", error)
    }

    // The default tab depends on the counts, so these two cannot run in
    // parallel. Seeding the tab we actually open on keeps the server and
    // client in agreement.
    const countResult = await getUserNotificationCounts(session.user.id)
    counts = countResult.total
    unreadTotal = Object.values(countResult.unread).reduce((sum, n) => sum + n, 0)

    initialTab = getDefaultNotificationTab(countResult.total)
    const result = await getUserNotifications(session.user.id, {
      tab: initialTab,
      limit: PAGE_SIZES.notificationsDropdown,
    })
    notifications = result.items
    notificationTotal = result.total
  }

  return (
    <NotificationsProvider
      initialTab={initialTab}
      notifications={notifications}
      total={notificationTotal}
      counts={counts}
      unreadTotal={unreadTotal}
    >
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Navbar withSidebarTrigger />
          <main className="flex-1 p-6">
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  )
}
