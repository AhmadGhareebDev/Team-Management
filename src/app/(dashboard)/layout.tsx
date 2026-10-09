import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./_components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Navbar } from "@/components/web/Navbar"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import {
  getUserNotifications,
  getUserNotificationCounts,
} from "@/db/queries/notifications"
import { runNotificationsScan } from "@/lib/notifications"
import { PAGE_SIZES } from "@/lib/pagination"


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  let notifications: Awaited<ReturnType<typeof getUserNotifications>> = {
    items: [],
    total: 0,
  }
  let counts = { total: { invitations: 0, tasks: 0, members: 0 }, unread: { invitations: 0, tasks: 0, members: 0 } }

  if (session) {
    try {
      await runNotificationsScan(session.user.id)
    } catch (error) {
      console.error("Error running notifications scan:", error)
    }

    const [result, countResult] = await Promise.all([
      getUserNotifications(session.user.id, {
        tab: "invitations",
        limit: PAGE_SIZES.notificationsDropdown,
      }),
      getUserNotificationCounts(session.user.id),
    ])

    notifications = result
    counts = countResult
  }

  const unreadTotal = Object.values(counts.unread).reduce((sum, n) => sum + n, 0)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar
          withSidebarTrigger
          notifications={notifications.items}
          notificationTotal={notifications.total}
          notificationCounts={counts.total}
          notificationUnreadTotal={unreadTotal}
        />
        <main className="flex-1 p-6">
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
