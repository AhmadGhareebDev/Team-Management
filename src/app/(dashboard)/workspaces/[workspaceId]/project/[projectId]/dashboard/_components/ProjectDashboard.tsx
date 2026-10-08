import Link from "next/link"
import { AlertCircle, ArrowLeft, Calendar } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import {
  ProjectHealthBadge,
  ProjectProgressBar,
} from "@/components/web/ProjectStats"
import ProjectViewToggle from "./ProjectViewToggle"
import { cn } from "@/lib/utils"
import {
  formatDueDate,
  getInitials,
  getPendingBlockers,
  isOverdue,
  priorityBadge,
  statusLabels,
  statusLeftAccent,
} from "@/lib/task-display"
import type { ProjectTask } from "@/db/queries/task"
import type { TaskStatus } from "@/db/validations"
import {
  getProgressPct,
  getProjectHealth,
  type ProjectStats,
} from "@/db/queries/stats"

const STATUS_ORDER: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "blocked",
  "done",
]

const MAX_AVATARS = 3

function StatTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-serif text-2xl font-bold tracking-tight",
          accent ? "text-destructive" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  )
}

function DashboardTaskRow({
  workspaceId,
  projectId,
  task,
}: {
  workspaceId: string
  projectId: string
  task: ProjectTask
}) {
  const pendingBlockers = getPendingBlockers(task.blockedBy)
  const isBlocked = task.status === "blocked" || pendingBlockers.length > 0
  const overdue = isOverdue(task.dueDate, task.status)

  const shownAssignees = task.assignees.slice(0, MAX_AVATARS)
  const hiddenAssignees = task.assignees.length - shownAssignees.length

  return (
    <Link
      href={`/workspaces/${workspaceId}/project/${projectId}?task=${task.id}`}
      className="group flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-sm font-medium leading-snug text-foreground">
          {task.title}
        </p>
        <Badge className={cn("shrink-0", priorityBadge[task.priority])}>
          {task.priority}
        </Badge>
      </div>

      {isBlocked && (
        <div className="flex items-start gap-1.5 rounded-md border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
          <AlertCircle className="mt-0.5 size-3 shrink-0" />
          <span className="min-w-0 break-words">
            Blocked by{" "}
            {pendingBlockers.length > 0
              ? pendingBlockers.map((d) => `"${d.dependsOn.title}"`).join(", ")
              : "a dependency"}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {task.dueDate ? (
          <span
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-medium",
              overdue ? "text-destructive" : "text-muted-foreground"
            )}
          >
            <Calendar className="size-3" />
            {overdue ? "Overdue · " : ""}
            {formatDueDate(task.dueDate)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground/60">No due date</span>
        )}

        {task.assignees.length > 0 && (
          <AvatarGroup>
            {shownAssignees.map((assignee) => (
              <ImageKitAvatar
                key={assignee.user.id}
                src={assignee.user.avatar_url}
                alt={assignee.user.name}
                initials={getInitials(assignee.user.name)}
                size={24}
                className="size-6!"
              />
            ))}
            {hiddenAssignees > 0 && (
              <AvatarGroupCount>+{hiddenAssignees}</AvatarGroupCount>
            )}
          </AvatarGroup>
        )}
      </div>
    </Link>
  )
}

function StatusColumn({
  status,
  tasks,
  workspaceId,
  projectId,
}: {
  status: TaskStatus
  tasks: ProjectTask[]
  workspaceId: string
  projectId: string
}) {
  return (
    <div className="flex min-h-40 flex-col gap-3 rounded-xl border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", statusLeftAccent[status])} />
          <h3 className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {statusLabels[status]}
          </h3>
        </span>
        <Badge className="shrink-0 border-border/60 bg-background text-muted-foreground">
          {tasks.length}
        </Badge>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center text-[11px] text-muted-foreground">
          No tasks
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <DashboardTaskRow
              key={task.id}
              workspaceId={workspaceId}
              projectId={projectId}
              task={task}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProjectDashboard({
  workspaceId,
  project,
  tasks,
  stats,
}: {
  workspaceId: string
  project: { id: string; name: string; description: string | null }
  tasks: ProjectTask[]
  stats: ProjectStats
}) {
  const progress = getProgressPct(stats)
  const health = getProjectHealth(stats)

  const tasksByStatus = new Map<TaskStatus, ProjectTask[]>(
    STATUS_ORDER.map((status) => [status, []])
  )
  for (const task of tasks) {
    tasksByStatus.get(task.status)?.push(task)
  }

  return (
    <div className="space-y-6 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/workspaces/${workspaceId}`}
            className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            aria-label="Back to workspace"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate font-serif text-3xl font-semibold text-foreground">
              {project.name}
            </h1>
            {project.description && (
              <p className="truncate text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        </div>

        <ProjectViewToggle
          workspaceId={workspaceId}
          projectId={project.id}
          active="dashboard"
        />
      </div>

      <section className="grid gap-4 md:grid-cols-12">
        <Card className="md:col-span-5">
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-foreground">
                Overall health
              </h2>
              <ProjectHealthBadge health={health} />
            </div>

            <div className="flex items-baseline justify-between gap-3">
              <span className="font-serif text-3xl font-bold tracking-tight text-foreground">
                {progress}%
              </span>
              <span className="text-xs text-muted-foreground">
                {stats.done} of {stats.total} tasks done
              </span>
            </div>

            <ProjectProgressBar value={progress} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:col-span-7">
          <StatTile label="Total" value={stats.total} />
          <StatTile label="Todo" value={stats.todo} />
          <StatTile label="In progress" value={stats.inProgress} />
          <StatTile label="In review" value={stats.inReview} />
          <StatTile label="Blocked" value={stats.blocked} accent={stats.blocked > 0} />
          <StatTile label="Overdue" value={stats.overdue} accent={stats.overdue > 0} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {STATUS_ORDER.map((status) => (
          <StatusColumn
            key={status}
            status={status}
            tasks={tasksByStatus.get(status) ?? []}
            workspaceId={workspaceId}
            projectId={project.id}
          />
        ))}
      </section>
    </div>
  )
}
