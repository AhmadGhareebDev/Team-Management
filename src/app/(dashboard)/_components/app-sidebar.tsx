"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Settings, LucideFolderMinus, ListTodo, FolderKanban } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export function AppSidebar() {
  const { data: session } = authClient.useSession()
  const pathname = usePathname()
  const user = session?.user
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)
  const initials = user?.name
    ? user.name
        .trim()
        .split(/\s+/)
        .map((word) => word[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "T"

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-2 py-2 transition-colors hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <ImageKitAvatar
            src={user?.avatar_url ?? null}
            alt={user?.name ?? ""}
            initials={initials}
            size={32}
            className="size-8"
          />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-medium text-foreground">
              {user?.name ?? "Account"}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {user?.username ? `@${user.username}` : ""}
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>You</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="My Tasks"
                isActive={isActive("/my-tasks")}
                render={<Link href="/my-tasks" />}
              >
                <ListTodo className="size-4" />
                <span>My Tasks</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="My Projects"
                isActive={isActive("/my-projects")}
                render={<Link href="/my-projects" />}
              >
                <FolderKanban className="size-4" />
                <span>My Projects</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Workspaces"
                isActive={isActive("/workspaces")}
                render={<Link href="/workspaces" />}
              >
                <LucideFolderMinus className="size-4" />
                <span>Workspaces</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Settings"
                isActive={isActive("/settings")}
                render={<Link href="/settings" />}
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}