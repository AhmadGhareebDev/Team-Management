"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Calendar, Check, Trash2, X, AlertCircle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { allowedTaskTransitions, TASK_STATUSES, updateTaskSchema, type TaskStatus } from "@/db/validations"
import { statusBadge, statusLabels } from "@/lib/task-display"
import type { ProjectTask } from "@/db/queries/task"
import type { ProjectWithMembers } from "@/db/queries/project"
import type { OptimisticApi } from "@/components/canvas/TaskNode"

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
] as const

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

const toDateInputValue = (date: Date) => {
  const d = new Date(date)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export default function TaskDetailsPanel({
  open,
  onOpenChange,
  task,
  currentUserId,
  isManager,
  members,
  optimistic,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: ProjectTask
  currentUserId: string
  isManager: boolean
  members: NonNullable<ProjectWithMembers>["members"]
  optimistic: OptimisticApi
}) {
  const [isPending, startTransition] = useTransition()
  const isAssignee = task.assignees.some((a) => a.user.id === currentUserId)
  // Mirrors updateTaskStatus: assignees move the task, and managers only when
  // nobody is assigned yet.
  const canToggleStatus =
    isAssignee || (isManager && task.assignees.length === 0)
  const pendingBlockers = task.blockedBy.filter((d) => d.dependsOn.status !== "done")
  const isBlocked = pendingBlockers.length > 0
  const overdueBlockers = task.blockedBy.filter(
    (d) => d.dependsOn.status !== "done" && d.dependsOn.dueDate != null && new Date(d.dependsOn.dueDate) < new Date()
  )
  // A blocked task has no user-selectable status, so the dropdown collapses to a badge.
  const allowedStatuses = allowedTaskTransitions(task.status)
  const canPickStatus = canToggleStatus && !isBlocked && allowedStatuses.length > 0

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(() => task.assignees.map((a) => a.user.id))
  const [confirmDelete, setConfirmDelete] = useState(false)

  const assigneesDirty =
    selectedUserIds.length !== task.assignees.length ||
    !selectedUserIds.every((id) => task.assignees.some((a) => a.user.id === id))

  const detailsForm = useForm<z.input<typeof updateTaskSchema>, unknown, z.output<typeof updateTaskSchema>>({
    resolver: zodResolver(updateTaskSchema),
    mode: "onSubmit",
    defaultValues: {
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ? toDateInputValue(task.dueDate) : "",
    },
  })

  // Synchronize internal state smoothly when task selection changes
  useEffect(() => {
    if (!open) return
    detailsForm.reset({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      dueDate: task.dueDate ? toDateInputValue(task.dueDate) : "",
    })
    setSelectedUserIds(task.assignees.map((a) => a.user.id))
    setConfirmDelete(false)
  }, [open, task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleStatusChange = (next: unknown) => {
    if (!canToggleStatus || isBlocked) return
    if (typeof next !== "string" || next === task.status) return
    optimistic.toggleTaskStatus(task.id, next as TaskStatus)
  }

  const handleSave = (data: z.output<typeof updateTaskSchema>) => {
    startTransition(() => {
      optimistic.updateTaskDetails(task.id, {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        dueDate: data.dueDate || null,
      })
    })
  }

  const toggleAssignee = (userId: string) => {
    if (!isManager) return
    setSelectedUserIds((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const handleSaveAssignees = () => {
    startTransition(() => {
      optimistic.setAssignees(task.id, selectedUserIds)
    })
  }

  const handleDelete = () => {
    onOpenChange(false)
    optimistic.deleteTask(task.id)
  }

  if (!open) return null

  return (
    <aside className="absolute top-0 right-0 z-40 flex h-full w-80 flex-col border-l border-border/60 bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-right-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
        <div className="min-w-0 flex-1 pr-2">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Task Details</p>
          <p className="truncate text-sm font-semibold text-foreground leading-snug">{task.title}</p>
        </div>
        <Button 
          variant="ghost" 
          size="icon-sm" 
          onClick={() => onOpenChange(false)} 
          aria-label="Close task details" 
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Button>
      </div>

      {/* Scrollable Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {/* Status Section */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Status</p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 p-2.5">
            {canPickStatus ? (
              <Select value={task.status} onValueChange={handleStatusChange}>
                <SelectTrigger
                  aria-label="Change task status"
                  className="h-7! rounded-md border border-border/60 bg-background px-2 text-xs font-normal normal-case tracking-normal"
                >
                  <SelectValue>
                    {(value) => {
                      const shown =
                        typeof value === "string" && value in statusLabels
                          ? (value as TaskStatus)
                          : task.status
                      return (
                        <span
                          className={cn(
                            "rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                            statusBadge[shown]
                          )}
                        >
                          {statusLabels[shown]}
                        </span>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-40 rounded-md">
                  {TASK_STATUSES.map((status) => (
                    <SelectItem
                      key={status}
                      value={status}
                      disabled={!allowedStatuses.includes(status)}
                      className="text-xs font-medium"
                    >
                      {statusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={cn("rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase", statusBadge[task.status])}>
                {statusLabels[task.status]}
              </span>
            )}
            {isBlocked ? (
              <p className="text-[10px] font-medium text-destructive truncate max-w-[140px]" title={`Blocked by ${pendingBlockers.map((d) => d.dependsOn.title).join(", ")}`}>
                Blocked by {pendingBlockers.map((d) => d.dependsOn.title).join(", ")}
              </p>
            ) : !canToggleStatus ? (
              <p className="text-[10px] text-muted-foreground">
                {task.assignees.length === 0
                  ? "Assign someone to move this task"
                  : "Assignees only"}
              </p>
            ) : null}
          </div>

          {/* Blocked Alerts */}
          {overdueBlockers.length > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              <Clock className="size-3.5 shrink-0" />
              <span className="leading-tight">
                Dependency overdue: {overdueBlockers.map((d) => d.dependsOn.title).join(", ")}
              </span>
            </div>
          )}
        </div>

        {/* Details Form */}
        <form onSubmit={detailsForm.handleSubmit(handleSave)} className="space-y-3">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Details</p>

          <Input 
            {...detailsForm.register("title")} 
            placeholder="Task title" 
            disabled={!isManager} 
            className="text-xs bg-muted/20 border-border/60 focus-visible:ring-1" 
          />

          <textarea
            {...detailsForm.register("description")}
            placeholder="Description..."
            disabled={!isManager}
            rows={3}
            className="w-full resize-none rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="relative">
            <Calendar className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              {...detailsForm.register("dueDate")} 
              type="date" 
              disabled={!isManager} 
              className="pl-9 text-xs bg-muted/20 border-border/60 focus-visible:ring-1" 
            />
          </div>

          {/* Priority Options */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRIORITIES.map((priority) => {
              const active = detailsForm.watch("priority") === priority.value
              return (
                <button
                  key={priority.value}
                  type="button"
                  disabled={!isManager}
                  onClick={() => detailsForm.setValue("priority", priority.value, { shouldDirty: true, shouldValidate: true })}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-semibold capitalize transition-all",
                    active 
                      ? "border-primary bg-primary text-primary-foreground shadow-xs" 
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground",
                    !isManager && "cursor-not-allowed opacity-60"
                  )}
                >
                  {priority.label}
                </button>
              )
            })}
          </div>

          {detailsForm.formState.errors.root && (
            <p className="text-xs text-destructive">{detailsForm.formState.errors.root.message}</p>
          )}

{isManager && (
            <Button type="submit" size="sm" disabled={isPending} className="w-full mt-2 font-medium">
              Save details
            </Button>
          )}
        </form>

        {/* Assignees Section */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">Assignees</p>
          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-1.5 scrollbar-thin">
            {members.length === 0 && (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No members in this project yet.</p>
            )}
            {members.map((m) => {
              const selectedItem = selectedUserIds.includes(m.user.id)
              return (
                <button
                  key={m.user.id}
                  type="button"
                  disabled={!isManager}
                  onClick={() => toggleAssignee(m.user.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                    selectedItem ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50 text-foreground",
                    !isManager && "cursor-default"
                  )}
                >
                  <ImageKitAvatar
                    src={m.user.avatar_url}
                    alt={m.user.id === currentUserId ? "You" : m.user.name}
                    initials={getInitials(m.user.name)}
                    size={20}
                    className="size-5 rounded-full"
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-xs">{m.user.id === currentUserId ? "You" : m.user.name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">@{m.user.username}</p>
                  </div>
                  {isManager && selectedItem && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                </button>
              )
            })}
          </div>

          {isManager && assigneesDirty && (
            <Button variant="secondary" size="sm" disabled={isPending} className="w-full mt-1" onClick={handleSaveAssignees}>
              Save assignees
            </Button>
          )}
        </div>

        {/* Danger Zone */}
        {isManager && (
          <div className="pt-2 border-t border-border/40">
            {!confirmDelete ? (
              <Button 
                variant="ghost" 
                size="sm"
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" 
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="size-3.5 mr-1.5" />
                Delete task
              </Button>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-xs text-destructive font-medium leading-normal">
                  Permanently delete this task and all its subtasks?
                </p>
                <div className="flex gap-2 pt-1">
                  <Button variant="destructive" size="sm" className="flex-1 h-7 text-xs" onClick={handleDelete}>
                    Confirm
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}