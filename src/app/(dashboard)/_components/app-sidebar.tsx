"use client"

import Link from "next/link"
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
import { Settings, LucideFolderMinus, BellRing } from "lucide-react"
import { authClient } from "@/lib/auth-client"

export function AppSidebar() {
  const { data: session } = authClient.useSession()
  const user = session?.user
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
        <div className="flex items-center gap-3 px-2 py-2">
          <ImageKitAvatar
            src={user?.avatar_url ?? null}
            alt={user?.name ?? ""}
            initials={initials}
            size={32}
            className="size-8"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">
              {user?.name ?? "Account"}
            </span>
            <span className="text-xs text-muted-foreground">
              {user?.username ? `@${user.username}` : ""}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="WorkSpaces" render={<Link href="/workspaces" />}>
                <LucideFolderMinus className="size-4" />
                <span>WorkSpaces</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Notifications" render={<Link href="/notifications" />}>
                <BellRing className="size-4" />
                <span>Notifications</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Settings" render={<Link href="/settings" />}>
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