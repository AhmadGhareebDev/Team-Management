"use client"

import * as React from "react"
import { Bell, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import NotificationRow from "@/components/web/NotificationRow"
import type { Notification } from "@/db/queries/notifications"

type NotificationTab = "invitations" | "tasks" | "members"

const tabLabels: Record<NotificationTab, string> = {
  invitations: "Invitations",
  tasks: "Tasks",
  members: "Members",
}

const taskTypes = [
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "deadline_approaching",
  "task_reassigned",
  "task_overdue",
] as const

function matchesTab(
  notification: Notification,
  tab: NotificationTab
): boolean {
  if (tab === "invitations") return notification.type === "workspace_invitation"
  if (tab === "members") return notification.type === "member_removed"
  return (taskTypes as readonly string[]).includes(notification.type)
}

export function NotificationsDropdown({
  notifications,
}: {
  notifications: Notification[]
}) {
  const [activeTab, setActiveTab] = React.useState<NotificationTab>("invitations")
  const [handledIds, setHandledIds] = React.useState<Set<string>>(() => new Set())

  const items = React.useMemo(
    () => notifications.filter((n) => !handledIds.has(n.id)),
    [notifications, handledIds]
  )

  const unreadCount = items.filter((n) => !n.isRead).length
  const visible = items.filter((n) => matchesTab(n, activeTab))

  const handleHandled = (id: string) => {
    setHandledIds((prev) => new Set(prev).add(id))
  }

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) setActiveTab("invitations")
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            className="relative border-0"
            aria-label="Notifications"
          />
        }
      >
        <Bell />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex size-2 items-center justify-center">
            <span className="absolute size-2 rounded-full bg-primary" />
            <span className="absolute size-2 animate-ping rounded-full bg-primary/60" />
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[360px]! p-0">
        <div className="flex items-center gap-1 border-b border-border p-2">
          {(["invitations", "tasks", "members"] as NotificationTab[]).map(
            (tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setActiveTab(tab)}
              >
                {tabLabels[tab]}
              </Button>
            )
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {visible.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Clock className="mx-auto size-6 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium text-foreground">
                No notifications yet
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((notification) => (
                <li key={notification.id}>
                  <NotificationRow
                    notification={notification}
                    onHandled={handleHandled}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}