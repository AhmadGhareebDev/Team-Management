import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "./_components/app-sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Navbar } from "@/components/web/Navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar withSidebarTrigger />
        <main className="flex-1 p-4">
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
