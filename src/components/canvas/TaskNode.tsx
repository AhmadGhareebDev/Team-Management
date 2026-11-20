"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { AlertCircle, Calendar, Check, ChevronRight, Clock, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { ProjectTask } from "@/db/queries/task"
import { allowedTaskTransitions, type UpdateTaskSchemaType } from "@/db/validations"
import {
  formatDueDate,
  getInitials,
  getPendingBlockers,
  priorityBadge,
  statusBadge,
  statusLabels,
  statusLeftAccent,
} from "@/lib/task-display"

export type OptimisticApi = {
  toggleTaskStatus: (taskId: string, nextStatus: ProjectTask["status"]) => void
  updateTaskDetails: (taskId: string, data: UpdateTaskSchemaType) => void
  setAssignees: (taskId: string, userIds: string[]) => void
  deleteTask: (taskId: string) => void
}

export type TaskNodeData = {
  task: ProjectTask
  projectId: string
  currentUserId: string | null
  isManager: boolean
  optimistic?: OptimisticApi
}

export type TaskNodeType = Node<TaskNodeData>

type TaskAssignee = ProjectTask["assignees"][number]

const emptyOptimisticApi: OptimisticApi = {
  toggleTaskStatus: () => {},
  updateTaskDetails: () => {},
  setAssignees: () => {},
  deleteTask: () => {},
}

function AssigneeAvatar({
  assignee,
  currentUserId,
}: {
  assignee: TaskAssignee
  currentUserId: string | null
}) {
  const displayName = assignee.user.id === currentUserId ? "You" : assignee.user.name

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0 cursor-pointer p-0.5" />}>
        <ImageKitAvatar
          src={assignee.user.avatar_url}
          alt={displayName}
          initials={getInitials(assignee.user.name)}
          size={22}
          className="size-[22px]! rounded-full border-0 ring-0 outline-none"
        />
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="z-50 flex-col items-start gap-0.5 border-0 outline-none"
      >
        <span className="text-xs font-medium">{displayName}</span>
        <span className="text-[11px] text-muted-foreground">@{assignee.user.username}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function AssigneeRow({
  assignees,
  currentUserId,
  isManager,
}: {
  assignees: TaskAssignee[]
  currentUserId: string | null
  isManager: boolean
}) {
  const shown = assignees.slice(0, 4)
  const hidden = assignees.slice(4)

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {assignees.length > 0 ? (
        <>
          <div className="flex items-center">
            {shown.map((assignee) => (
              <AssigneeAvatar
                key={assignee.user.id}
                assignee={assignee}
                currentUserId={currentUserId}
              />
            ))}
          </div>
          {hidden.length > 0 && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="cursor-pointer border border-border/60 bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground" />
                }
              >
                +{hidden.length}
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={8} className="z-50 text-xs">
                {hidden.map((assignee) => assignee.user.name).join(", ")}
              </TooltipContent>
            </Tooltip>
          )}
        </>
      ) : (
        <span className="text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
          Unassigned
        </span>
      )}

      {isManager && (
        <span
          title="Drag to arrange"
          className="ml-auto flex items-center text-muted-foreground/50 transition-colors group-hover:text-muted-foreground"
        >
          <GripVertical className="size-3.5" aria-hidden="true" />
          <span className="sr-only">Drag to arrange</span>
        </span>
      )}
    </div>
  )
}

function TaskNodeComponent({ data, selected }: NodeProps) {
  const task = (data as TaskNodeData).task
  const currentUserId = (data as TaskNodeData).currentUserId
  const isManager = (data as TaskNodeData).isManager
  const optimistic = (data as TaskNodeData).optimistic ?? emptyOptimisticApi

  const pendingBlockers = getPendingBlockers(task.blockedBy)
  const isBlocked = pendingBlockers.length > 0
  const isDone = task.status === "done"
  const isAssignee = task.assignees.some((assignee) => assignee.user.id === currentUserId)
  const canToggleStatus = isAssignee || (isManager && task.assignees.length === 0)
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone
  const overdueBlockers = task.blockedBy.filter(
    (dependency) =>
      dependency.dependsOn.status !== "done" &&
      dependency.dependsOn.dueDate != null &&
      new Date(dependency.dependsOn.dueDate) < new Date()
  )

  const dueDateLabel = task.dueDate ? formatDueDate(task.dueDate) : null

  const blockerNames = pendingBlockers.map((dependency) => dependency.dependsOn.title)
  const blockedLabel =
    pendingBlockers.length === 1
      ? `Blocked by ${blockerNames[0]}`
      : `Blocked by ${pendingBlockers.length} tasks`
  const blockerTitle = [
    `Blocked by: ${blockerNames.join(", ")}`,
    overdueBlockers.length > 0
      ? `${overdueBlockers.length} blocker${overdueBlockers.length === 1 ? "" : "s"} past due`
      : null,
  ]
    .filter(Boolean)
    .join("\n")

  const nextStatus = allowedTaskTransitions(task.status)[0] ?? null
  const canAdvance = Boolean(nextStatus) && canToggleStatus && !isBlocked
  const advanceLabel = isDone
    ? "Task is done"
    : isBlocked
      ? `Complete first: ${blockerNames.join(", ")}`
      : !canToggleStatus
        ? "Only assigned members can move this task along"
        : nextStatus
          ? `Move task to ${statusLabels[nextStatus]}`
          : "No further status available"

  const handleAdvanceStatus = () => {
    if (!nextStatus || !canAdvance) return
    optimistic.toggleTaskStatus(task.id, nextStatus)
  }

  return (
    <div className="group relative w-72">
      <Handle
        type="target"
        position={Position.Left}
        className="!left-0 !z-40 !size-2.5 !border-0 !bg-muted-foreground/40 !outline-none transition-colors group-hover:!bg-primary"
      />

      <div
        className={cn(
          "relative overflow-hidden bg-card ring-1 ring-border/80 transition-shadow duration-200 hover:ring-foreground/20",
          isBlocked && "ring-destructive/25",
          selected && "ring-2 ring-primary"
        )}
      >
        <div
          className={cn("absolute inset-y-0 left-0 w-[3px]", statusLeftAccent[task.status])}
          aria-hidden="true"
        />

        <div className="flex flex-col gap-2.5 py-3.5 pr-3.5 pl-4">
          <div className="flex items-start gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <p className="line-clamp-2 min-w-0 flex-1 cursor-default text-[13px] leading-snug font-semibold text-card-foreground" />
                }
              >
                {task.title}
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="z-50 max-w-xs text-xs font-normal"
              >
                {task.title}
              </TooltipContent>
            </Tooltip>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                event.preventDefault()
                handleAdvanceStatus()
              }}
              disabled={!canAdvance}
              title={advanceLabel}
              aria-label={advanceLabel}
              className={cn(
                "nodrag -mt-0.5 flex size-6 shrink-0 items-center justify-center border transition-colors outline-none focus-visible:ring-1 focus-visible:ring-ring",
                isDone
                  ? "cursor-default border-transparent bg-emerald-600 text-white"
                  : "border-border/60 bg-background text-muted-foreground hover:border-foreground/30 hover:bg-muted hover:text-foreground",
                !canAdvance && !isDone && "cursor-not-allowed opacity-40"
              )}
            >
              {isDone ? (
                <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
              ) : (
                <ChevronRight className="size-3.5" strokeWidth={3} aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <span
              className={cn(
                "border-0 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                statusBadge[task.status]
              )}
            >
              {statusLabels[task.status]}
            </span>
            <span
              className={cn(
                "border-0 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                priorityBadge[task.priority]
              )}
            >
              {task.priority}
            </span>
            {task.dueDate && (
              <span
                className={cn(
                  "ml-auto flex items-center gap-1 text-[11px] font-medium",
                  overdue ? "text-destructive" : "text-muted-foreground"
                )}
              >
                <Calendar className="size-3 shrink-0" aria-hidden="true" />
                {dueDateLabel}
              </span>
            )}
          </div>

          {isBlocked && (
            <div
              title={blockerTitle}
              className="flex items-center gap-1.5 bg-destructive/10 px-2 py-1 text-[11px] font-medium text-destructive"
            >
              <AlertCircle className="size-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{blockedLabel}</span>
              {overdueBlockers.length > 0 && (
                <>
                  <span aria-hidden={true} className="shrink-0 text-destructive/50">
                    /
                  </span>
                  <span className="shrink-0">overdue</span>
                  <Clock className="ml-auto size-3 shrink-0" aria-hidden="true" />
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/10 px-4 py-2">
          <div className="min-w-0 flex-1">
            <AssigneeRow
              assignees={task.assignees}
              currentUserId={currentUserId}
              isManager={isManager}
            />
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!right-0 !z-40 !size-2.5 !border-0 !bg-muted-foreground/40 !outline-none transition-colors group-hover:!bg-primary"
      />
    </div>
  )
}

export default memo(TaskNodeComponent)
