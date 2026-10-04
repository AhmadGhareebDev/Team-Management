import Link from "next/link"
import { AlertCircle, Calendar, ListCheck } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { cn } from "@/lib/utils"
import {
  formatDueDate,
  getInitials,
  getPendingBlockers,
  priorityBadge,
  statusBadge,
  statusLabels,
  statusLeftAccent,
} from "@/lib/task-display"
import type { UserAssignedTask } from "@/db/queries/task"

const MAX_AVATARS = 4

export default function UserTaskCard({ task }: { task: UserAssignedTask }) {
  const { project } = task
  const pendingBlockers = getPendingBlockers(task.blockedBy)
  const isBlocked = pendingBlockers.length > 0
  const isDone = task.status === "done"

  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone

  const doneSubtasks = task.subtasks.filter((s) => s.isDone).length
  const hasSubtasks = task.subtasks.length > 0

  const shownAssignees = task.assignees.slice(0, MAX_AVATARS)
  const hiddenAssigneeCount = task.assignees.length - shownAssignees.length

  return (
    <Link
      href={`/workspaces/${project.workspace.id}/project/${project.id}?task=${task.id}`}
      className="group/card block h-full focus-visible:outline-none"
    >
      <Card
        size="sm"
        className={cn(
          "group/card relative h-full overflow-hidden border-0 bg-card transition-colors duration-200",
          "hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-primary",
          isBlocked && "border-destructive/30"
        )}
      >
        <span
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-200",
            statusLeftAccent[task.status]
          )}
        />

        <CardContent className="flex h-full flex-col gap-3 p-5 pl-6">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="truncate">{project.workspace.name}</span>
            <span className="shrink-0 text-muted-foreground/50">/</span>
            <span className="truncate font-medium text-foreground/80">
              {project.name}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className={statusBadge[task.status]}>
              {isBlocked ? "Blocked" : statusLabels[task.status]}
            </Badge>
            <Badge className={priorityBadge[task.priority]}>
              {task.priority}
            </Badge>
          </div>

          <p className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {task.title}
          </p>

          {task.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {task.description}
            </p>
          ) : (
            <p className="text-sm italic text-muted-foreground/60">
              No description provided.
            </p>
          )}

          {isBlocked && (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
              <AlertCircle className="size-3 shrink-0" />
              <span className="truncate">
                Blocked by {pendingBlockers.map((d) => d.dependsOn.title).join(", ")}
              </span>
            </div>
          )}

          {task.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-medium",
                overdue ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Calendar className="size-3 shrink-0" />
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            {hasSubtasks ? (
              <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <ListCheck className="size-3.5" />
                {doneSubtasks}/{task.subtasks.length}
              </span>
            ) : (
              <span />
            )}

            {task.assignees.length > 0 && (
              <div className="flex items-center gap-1">
                <AvatarGroup>
                  {shownAssignees.map((a) => (
                    <ImageKitAvatar
                      key={a.user.id}
                      src={a.user.avatar_url}
                      alt={a.user.name}
                      initials={getInitials(a.user.name)}
                      size={24}
                      className="size-6!"
                    />
                  ))}
                  {hiddenAssigneeCount > 0 && (
                    <AvatarGroupCount>+{hiddenAssigneeCount}</AvatarGroupCount>
                  )}
                </AvatarGroup>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}