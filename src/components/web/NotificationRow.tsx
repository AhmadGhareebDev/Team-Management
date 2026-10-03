"use client"

import * as React from "react"
import {
  CheckCircle2,
  Clock,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { respondInvitation } from "@/actions/workspace"
import { markNotificationAsRead } from "@/actions/notifications"
import type { Notification } from "@/db/queries/notifications"
import { cn } from "@/lib/utils"
import { resolveActionError } from "@/lib/error-messages"

const taskTypes = [
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "dependency_resolved",
  "deadline_approaching",
  "task_reassigned",
  "task_overdue",
] as const

const taskIcons: Record<(typeof taskTypes)[number], typeof CheckCircle2> = {
  task_assigned: CheckCircle2,
  task_unblocked: CheckCircle2,
  task_reassigned: CheckCircle2,
  task_overdue: Clock,
  deadline_approaching: Clock,
  dependency_overdue: Clock,
  dependency_resolved: CheckCircle2,
}

function formatRelativeTime(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export default function NotificationRow({
  notification,
  onRead,
}: {
  notification: Notification
  onRead?: (id: string) => void
}) {
  const router = useRouter()
  const [action, setAction] = React.useState<"accepted" | "declined" | null>(null)

  const handleOpenTask = async () => {
    const url =
      notification.projectId && notification.project
        ? `/workspaces/${notification.project.workspaceId}/project/${notification.projectId}`
        : null

    try {
      if (!notification.isRead) {
        await markNotificationAsRead(notification.id)
      }

      if (url) {
        onRead?.(notification.id)
        router.push(url)
      } else {
        onRead?.(notification.id)
        router.refresh()
      }
    } catch {
      toast.add({
        type: "error",
        description: "We couldn't open this notification. Please try again.",
      })
    }
  }

  const handleAction = async (choice: "accepted" | "declined") => {
    if (!notification.workspaceInvitationId) return
    setAction(choice)
    try {
      const result = await respondInvitation({
        invitationId: notification.workspaceInvitationId,
        action: choice,
      })

      if (result?.error) {
        toast.add({
          type: "error",
          description: resolveActionError(
            result.error,
            "We couldn't respond to this invitation. Please try again.",
            {
              UNAUTHENTICATED: "You must be logged in to respond to an invitation.",
              NOT_FOUND: "This invitation could not be found.",
              ALREADY_HANDLED: "This invitation has already been handled.",
            }
          ),
        })
        return
      }

      if (result.success) {
        // The row stays in the list; the refreshed status swaps the buttons
        // for an "accepted"/"declined" label.
        router.refresh()
        toast.add({
          type: "success",
          description:
            choice === "accepted"
              ? "Invitation accepted. Welcome to the workspace!"
              : "Invitation declined.",
        })
      }
    } finally {
      setAction(null)
    }
  }

  if (notification.type === "workspace_invitation") {
    const actor = notification.actor
    // The invitation row itself is the source of truth: once answered, the
    // Accept/Decline buttons must not come back on the next render.
    const invitationStatus = notification.workspaceInvitation?.status ?? "pending"
    const isPending = invitationStatus === "pending"
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <ImageKitAvatar
          src={actor?.avatar_url ?? null}
          alt={actor?.name ?? "Unknown"}
          initials={initials(actor?.name ?? "U")}
          size={32}
          className="size-8!"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-foreground">
            <span className="font-medium">
              {actor?.name ?? "Someone"}
            </span>{" "}
            invited you to join the{" "}
            <span className="font-medium">
              {notification.workspace?.name ?? "workspace"}
            </span>
            .
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </p>
          {isPending ? (
            <div className="mt-2 flex items-center gap-2">
              <Button
                variant="default"
                size="xs"
                disabled={action !== null}
                onClick={() => handleAction("accepted")}
              >
                {action === "accepted" && (
                  <Spinner data-icon="inline-start" className="size-3" />
                )}
                Accept
              </Button>
              <Button
                variant="outline"
                size="xs"
                disabled={action !== null}
                onClick={() => handleAction("declined")}
              >
                {action === "declined" && (
                  <Spinner data-icon="inline-start" className="size-3" />
                )}
                Decline
              </Button>
            </div>
          ) : (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {invitationStatus === "accepted" ? "Invitation accepted" : "Invitation declined"}
            </p>
          )}
        </div>
        {!notification.isRead && (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    )
  }

  if (
    notification.type === "member_removed" ||
    notification.type === "project_member_added"
  ) {
    const AddedIcon = notification.type === "project_member_added" ? UserPlus : UserMinus
    return (
      <div className="flex items-start gap-3 px-4 py-3">
        <AddedIcon
          className={cn(
            "mt-0.5 size-4 shrink-0",
            notification.isRead ? "text-muted-foreground" : "text-foreground"
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs leading-relaxed text-foreground">
            {notification.body}
          </p>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </p>
        </div>
        {!notification.isRead && (
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
        )}
      </div>
    )
  }

  const TaskIcon =
    taskIcons[notification.type as (typeof taskTypes)[number]] ?? CheckCircle2
  return (
    <button
      type="button"
      onClick={handleOpenTask}
      aria-label={notification.body}
      className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
    >
      <TaskIcon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          notification.isRead ? "text-muted-foreground" : "text-foreground"
        )}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-relaxed text-foreground">
          {notification.body}
        </p>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.isRead && (
        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  )
}