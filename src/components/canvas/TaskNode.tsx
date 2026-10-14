"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { AlertCircle, Calendar, Check, ChevronRight, Clock } from "lucide-react"
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

function AssigneeAvatar({ assignee, currentUserId }: { assignee: TaskAssignee; currentUserId: string | null }) {
  const displayName = assignee.user.id === currentUserId ? "You" : assignee.user.name

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex shrink-0 cursor-pointer p-0.5" />}>
        <ImageKitAvatar
          src={assignee.user.avatar_url}
          alt={displayName}
          initials={getInitials(assignee.user.name)}
          size={24}
          className="size-6! rounded-full border-0 ring-0 outline-none"
        />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="flex-col items-start gap-0.5 z-50 border-0 outline-none">
        <span className="font-medium text-xs">{displayName}</span>
        <span className="text-[10px] text-muted-foreground">@{assignee.user.username}</span>
      </TooltipContent>
    </Tooltip>
  )
}

function AssigneeStack({ assignees, currentUserId }: { assignees: TaskAssignee[]; currentUserId: string | null }) {
  const shown = assignees.slice(0, 2)
  const hidden = assignees.slice(2)
  const hiddenCount = hidden.length

  return (
    <div onClick={(e) => e.stopPropagation()} className="nodrag nopan absolute top-3 -right-3 translate-x-full z-30">
      <div className="group/stack flex cursor-pointer flex-col gap-1 overflow-visible">
        <div className="flex flex-col gap-1 overflow-visible">
          {shown.map((a) => (
            <AssigneeAvatar key={a.user.id} assignee={a} currentUserId={currentUserId} />
          ))}
          {hiddenCount > 0 && (
            <div className="group-hover/stack:hidden flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground border-0 ring-0 outline-none">
              +{hiddenCount}
            </div>
          )}
        </div>

        {hiddenCount > 0 && (
          <div className="grid grid-rows-[0fr] group-hover/stack:grid-rows-[1fr]">
            <div className="overflow-hidden min-h-0">
              <div className="flex flex-col gap-1 pt-1">
                {hidden.map((a) => (
                  <AssigneeAvatar key={a.user.id} assignee={a} currentUserId={currentUserId} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
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
  const isAssignee = task.assignees.some((a) => a.user.id === currentUserId)
  const canToggleStatus =
    isAssignee || (isManager && task.assignees.length === 0)
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone
  const overdueBlockers = task.blockedBy.filter(
    (d) => d.dependsOn.status !== "done" && d.dependsOn.dueDate != null && new Date(d.dependsOn.dueDate) < new Date()
  )

  const dueDateLabel = task.dueDate ? formatDueDate(task.dueDate) : null

  const nextStatus = allowedTaskTransitions(task.status)[0] ?? null
  const canAdvance = Boolean(nextStatus) && canToggleStatus && !isBlocked

  const handleAdvanceStatus = () => {
    if (!nextStatus || !canAdvance) return
    optimistic.toggleTaskStatus(task.id, nextStatus)
  }

  return (
    <div className="relative group overflow-visible">
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2.5 !bg-muted-foreground/60 !border-0 !outline-none !z-40"
      />

      <div
        className={cn(
          "relative w-72 rounded-xl border-0 outline-none bg-card p-4 overflow-hidden",
          isBlocked && "bg-destructive/[0.02]",
          selected && "ring-2 ring-primary/80"
        )}
      >
        {/* Left Status Indicator Strip - Flattened as background block with border-0 */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 border-0 outline-none", statusLeftAccent[task.status])} />

        <div className="flex flex-col gap-3 pl-1.5">
          <div className="flex items-start justify-between gap-2.5">
            <Tooltip>
              <TooltipTrigger render={<p className="line-clamp-2 flex-1 text-sm leading-snug font-bold text-card-foreground cursor-default border-0 outline-none" />}>
                {task.title}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs font-normal z-50 border-0 outline-none">
                {task.title}
              </TooltipContent>
            </Tooltip>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                handleAdvanceStatus()
              }}
              disabled={!canAdvance}
              title={
                isBlocked
                  ? `Complete first: ${pendingBlockers.map((p) => p.dependsOn.title).join(", ")}`
                  : !canToggleStatus
                    ? "Only assigned members can move this task along"
                    : nextStatus
                      ? `Move to ${statusLabels[nextStatus]}`
                      : "No further status available"
              }
              aria-label={nextStatus ? `Move task to ${statusLabels[nextStatus]}` : "No further status available"}
              className={cn(
                "nodrag mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-0 outline-none",
                isDone
                  ? "bg-emerald-500 text-white"
                  : "bg-background text-muted-foreground hover:text-primary",
                !canAdvance && "cursor-not-allowed opacity-40"
              )}
            >
              {isDone ? <Check className="size-3" strokeWidth={3} /> : <ChevronRight className="size-3" strokeWidth={3} />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md border-0 outline-none", statusBadge[task.status])}>
              {statusLabels[task.status]}
            </span>
            <span className={cn("px-2 py-0.5 text-[10px] font-semibold tracking-wider capitalize rounded-md border-0 outline-none", priorityBadge[task.priority])}>
              {task.priority}
            </span>
          </div>

          {task.dueDate && (
            <div className={cn("flex items-center gap-1.5 text-xs font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
              <Calendar className="size-3.5 shrink-0" />
              <span>{dueDateLabel}</span>
            </div>
          )}

          {isBlocked && pendingBlockers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border-0 outline-none bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
              <AlertCircle className="size-3 shrink-0" />
              <span className="truncate">Blocked by {pendingBlockers.map((d) => d.dependsOn.title).join(", ")}</span>
            </div>
          )}

          {overdueBlockers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border-0 outline-none bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <Clock className="size-3 shrink-0" />
              <span className="truncate">Dependency overdue: {overdueBlockers.map((d) => d.dependsOn.title).join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !bg-muted-foreground/60 !border-0 !outline-none !z-40 !bottom-0 translate-y-1/2"
      />

      {task.assignees.length > 0 && <AssigneeStack assignees={task.assignees} currentUserId={currentUserId} />}
    </div>
  )
}

export default memo(TaskNodeComponent)