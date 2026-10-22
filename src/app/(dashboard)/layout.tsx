import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./_components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Navbar } from "@/components/web/Navbar"
import { NotificationsProvider } from "@/components/web/NotificationsProvider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationsProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <Navbar withSidebarTrigger />
          <main id="main" tabIndex={-1} className="flex-1 p-4 outline-none sm:p-6">
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationsProvider>
  )
}
