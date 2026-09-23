import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./_components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Navbar } from "@/components/web/Navbar"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserNotifications } from "@/db/queries/notifications"
import { runNotificationsScan } from "@/lib/notifications"


export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  let notifications: Awaited<ReturnType<typeof getUserNotifications>> = []
  if (session) {
    try {
      await runNotificationsScan(session.user.id)
    } catch (error) {
      console.error("Error running notifications scan:", error)
    }
    notifications = await getUserNotifications(session.user.id)
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar withSidebarTrigger notifications={notifications} />
        <main className="flex-1 p-6">
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
