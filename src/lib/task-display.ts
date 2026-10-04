import { task } from "@/db/schemas"
import type { TaskStatus } from "@/db/validations"

export type TaskPriority = (typeof task.priority.enumValues)[number]

export const statusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
}

export const statusBadge: Record<TaskStatus, string> = {
  todo: "bg-muted text-muted-foreground border-muted-foreground/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
}

export const statusLeftAccent: Record<TaskStatus, string> = {
  todo: "bg-muted-foreground/60",
  in_progress: "bg-primary",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
  blocked: "bg-destructive",
}

export const priorityBadge: Record<TaskPriority, string> = {
  low: "bg-muted text-muted-foreground border-muted-foreground/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function formatDueDate(dueDate: Date | string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(dueDate)
  )
}

export function getPendingBlockers<T extends { dependsOn: { status: TaskStatus } }>(
  blockedBy: readonly T[]
) {
  return blockedBy.filter((d) => d.dependsOn.status !== "done")
}