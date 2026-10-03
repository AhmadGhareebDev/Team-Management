"use client"

import { useState, useTransition, type SyntheticEvent } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { AlertCircle, Calendar, Check, ChevronRight, Clock, Plus, Trash2, ListCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import type { ProjectTask } from "@/db/queries/task"
import { allowedTaskTransitions, type UpdateTaskSchemaType } from "@/db/validations"

export type OptimisticApi = {
  toggleTaskStatus: (taskId: string, nextStatus: ProjectTask["status"]) => void
  updateTaskDetails: (taskId: string, data: UpdateTaskSchemaType) => void
  setAssignees: (taskId: string, userIds: string[]) => void
  addSubtask: (taskId: string, title: string) => Promise<boolean>
  toggleSubtask: (taskId: string, subtaskId: string) => void
  deleteSubtask: (taskId: string, subtaskId: string) => void
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

const statusLabels: Record<ProjectTask["status"], string> = {
  todo: "Todo",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
  blocked: "Blocked",
}

const statusLeftAccent: Record<ProjectTask["status"], string> = {
  todo: "bg-muted-foreground/60",
  in_progress: "bg-primary",
  in_review: "bg-amber-500",
  done: "bg-emerald-500",
  blocked: "bg-destructive",
}

const statusBadge: Record<ProjectTask["status"], string> = {
  todo: "bg-muted text-muted-foreground border-muted-foreground/20",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  in_review: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  blocked: "bg-destructive/10 text-destructive border-destructive/20",
}

const priorityBadge: Record<ProjectTask["priority"], string> = {
  low: "bg-muted text-muted-foreground border-muted-foreground/20",
  medium: "bg-primary/10 text-primary border-primary/20",
  high: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  urgent: "bg-destructive/10 text-destructive border-destructive/20",
}

const emptyOptimisticApi: OptimisticApi = {
  toggleTaskStatus: () => {},
  updateTaskDetails: () => {},
  setAssignees: () => {},
  addSubtask: () => Promise.resolve(false),
  toggleSubtask: () => {},
  deleteSubtask: () => {},
  deleteTask: () => {},
}

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

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
          className="size-6! rounded-full ring-2 ring-background transition-transform duration-150 hover:scale-110 shadow-sm"
        />
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="flex-col items-start gap-0.5 z-50">
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
            <div className="group-hover/stack:hidden flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-background shadow-xs">
              +{hiddenCount}
            </div>
          )}
        </div>

        {hiddenCount > 0 && (
          <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-200 ease-out group-hover/stack:grid-rows-[1fr]">
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

export default function TaskNode({ data, selected }: NodeProps) {
  const task = (data as TaskNodeData).task
  const currentUserId = (data as TaskNodeData).currentUserId
  const isManager = (data as TaskNodeData).isManager
  const optimistic = (data as TaskNodeData).optimistic ?? emptyOptimisticApi

  const [subtaskTitle, setSubtaskTitle] = useState("")
  const [isAddPending, startAddTransition] = useTransition()

  const pendingBlockers = task.blockedBy.filter((d) => d.dependsOn.status !== "done")
  const isBlocked = pendingBlockers.length > 0
  const isDone = task.status === "done"
  const isAssignee = task.assignees.some((a) => a.user.id === currentUserId)
  // Only assignees move a task. With nobody assigned, managers may still do it
  // so an unassigned task is never stranded. Mirrors updateTaskStatus.
  const canToggleStatus =
    isAssignee || (isManager && task.assignees.length === 0)
  const canManageSubtasks = isManager || isAssignee
  // Only the person who created a subtask may tick it off.
  const canToggleSubtask = (subtask: ProjectTask["subtasks"][number]) =>
    canManageSubtasks && subtask.createdBy.id === currentUserId
  const overdue = task.dueDate && new Date(task.dueDate) < new Date() && !isDone
  const overdueBlockers = task.blockedBy.filter(
    (d) => d.dependsOn.status !== "done" && d.dependsOn.dueDate != null && new Date(d.dependsOn.dueDate) < new Date()
  )

  const sortedSubtasks = [...task.subtasks].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const doneCount = sortedSubtasks.filter((s) => s.isDone).length

  const dueDateLabel = task.dueDate
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(task.dueDate))
    : null

  // The quick button walks the same chain as the details dropdown, one step at a
  // time, so a skip like in_progress -> done can never be sent to the server.
  const nextStatus = allowedTaskTransitions(task.status)[0] ?? null
  const canAdvance = Boolean(nextStatus) && canToggleStatus && !isBlocked

  const handleAdvanceStatus = () => {
    if (!nextStatus || !canAdvance) return
    optimistic.toggleTaskStatus(task.id, nextStatus)
  }

  const handleAddSubtask = (event: SyntheticEvent) => {
    event.preventDefault()
    const title = subtaskTitle.trim()
    if (!title || isAddPending) return

    startAddTransition(async () => {
      const created = await optimistic.addSubtask(task.id, title)
      if (created) setSubtaskTitle("")
    })
  }

  return (
    <div className="relative group overflow-visible">
      {/* Target Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2.5 !bg-muted-foreground/60 !border-2 !border-background transition-all group-hover:!bg-primary group-hover:!scale-125 !z-40"
      />

      {/* Primary Task Card Node */}
      <div
        className={cn(
          "relative w-64 rounded-xl border border-border/80 bg-card/95 p-3.5 shadow-md backdrop-blur-md transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lg overflow-hidden",
          isBlocked && "border-destructive/30 bg-destructive/[0.02]",
          selected && "ring-2 ring-primary/80 border-primary shadow-lg scale-[1.01]"
        )}
      >
        {/* Status Indicator Bar */}
        <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-200", statusLeftAccent[task.status])} />

        <div className="flex flex-col gap-2.5 pl-1.5">
          {/* Title & Complete Checkbox Header */}
          <div className="flex items-start justify-between gap-2">
            <Tooltip>
              <TooltipTrigger render={<p className="line-clamp-2 flex-1 text-xs leading-snug font-semibold text-card-foreground hover:text-foreground transition-colors cursor-default" />}>
                {task.title}
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs font-normal z-50">
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
                "nodrag mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150 shadow-xs",
                isDone
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-muted-foreground/40 bg-background hover:border-primary hover:text-primary",
                !canAdvance && "cursor-not-allowed opacity-40"
              )}
            >
              {isDone ? <Check className="size-2.5" strokeWidth={3} /> : <ChevronRight className="size-2.5" strokeWidth={3} />}
            </button>
          </div>

          {/* Status & Priority Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-md border shadow-2xs", statusBadge[task.status])}>
              {statusLabels[task.status]}
            </span>
            <span className={cn("px-2 py-0.5 text-[10px] font-semibold tracking-wider capitalize rounded-md border shadow-2xs", priorityBadge[task.priority])}>
              {task.priority}
            </span>
          </div>

          {/* Date Label */}
          {task.dueDate && (
            <div className={cn("flex items-center gap-1.5 text-[11px] font-medium", overdue ? "text-destructive" : "text-muted-foreground")}>
              <Calendar className="size-3 shrink-0" />
              <span>{dueDateLabel}</span>
            </div>
          )}

          {/* Blocked Alert Banner */}
          {isBlocked && pendingBlockers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-medium text-destructive">
              <AlertCircle className="size-3 shrink-0" />
              <span className="truncate">Blocked by {pendingBlockers.map((d) => d.dependsOn.title).join(", ")}</span>
            </div>
          )}

          {/* Overdue Dependency Banner */}
          {overdueBlockers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
              <Clock className="size-3 shrink-0" />
              <span className="truncate">Dependency overdue: {overdueBlockers.map((d) => d.dependsOn.title).join(", ")}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hover Dropdown Pane for Subtasks */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="nodrag nopan opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all duration-200 absolute top-full left-0 z-30 w-full pt-2"
      >
        <div className="w-full overflow-hidden rounded-xl border border-border/80 bg-popover/95 p-1 shadow-xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-2.5 py-1.5">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ListCheck className="size-3.5" />
              <span className="text-[10px] font-semibold tracking-wider uppercase">
                {task.subtasks.length > 0 ? `${doneCount}/${task.subtasks.length} Subtasks` : "Subtasks"}
              </span>
            </div>
          </div>

          {/* Add Subtask Input Form */}
          {canManageSubtasks && (
            <form onSubmit={handleAddSubtask} className="flex items-center gap-1.5 border-b border-border/50 px-2 py-1.5">
              <Input
                value={subtaskTitle}
                onChange={(e) => setSubtaskTitle(e.target.value)}
                placeholder="Add new subtask..."
                className="h-7 text-xs bg-background/50 border-muted-foreground/20 focus-visible:ring-1"
              />
              <Button type="submit" size="icon-sm" className="h-7 size-7 shrink-0" disabled={isAddPending || !subtaskTitle.trim()} aria-label="Add subtask">
                {isAddPending ? (
                  <Spinner className="size-3" />
                ) : (
                  <Plus className="size-3.5" />
                )}
              </Button>
            </form>
          )}

          {/* Subtasks List */}
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto p-1 scrollbar-thin">
            {sortedSubtasks.length === 0 && (
              <p className="px-2 py-2 text-center text-[11px] text-muted-foreground italic">No subtasks created yet.</p>
            )}
            {sortedSubtasks.map((subtask) => (
              <div
                key={subtask.id}
                className="group/subtask flex items-center justify-between gap-1.5 rounded-lg px-2 py-1 transition-colors hover:bg-muted/70"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {/* Subtask Checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      optimistic.toggleSubtask(task.id, subtask.id)
                    }}
                    disabled={!canToggleSubtask(subtask)}
                    title={
                      canToggleSubtask(subtask)
                        ? undefined
                        : "Only the person who created this subtask can tick it off"
                    }
                    aria-label={subtask.isDone ? "Mark subtask as not done" : "Mark subtask as done"}
                    className={cn(
                      "flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-all shadow-2xs",
                      subtask.isDone
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/40 bg-background hover:border-emerald-500 hover:text-emerald-500",
                      !canToggleSubtask(subtask) && "cursor-not-allowed opacity-40"
                    )}
                  >
                    {subtask.isDone && <Check className="size-2" strokeWidth={3} />}
                  </button>

                  {/* Subtask Title Tooltip Wrapper */}
                  <Tooltip>
                    <TooltipTrigger render={
                      <span className={cn("truncate text-xs leading-normal select-none cursor-default", subtask.isDone ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-popover-foreground font-medium")}>
                        {subtask.title}
                      </span>
                    } />
                    <TooltipContent side="right" className="max-w-xs text-xs z-50">
                      {subtask.title}
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Subtask Delete Action */}
                {canManageSubtasks && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      e.preventDefault()
                      optimistic.deleteSubtask(task.id, subtask.id)
                    }}
                    title="Delete subtask"
                    aria-label="Delete subtask"
                    className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all focus-visible:opacity-100 group-hover/subtask:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Source Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !bg-muted-foreground/60 !border-2 !border-background transition-all group-hover:!bg-primary group-hover:!scale-125 !z-40 !bottom-0 translate-y-1/2"
      />

      {/* Assignee Stack */}
      {task.assignees.length > 0 && <AssigneeStack assignees={task.assignees} currentUserId={currentUserId} />}
    </div>
  )
}