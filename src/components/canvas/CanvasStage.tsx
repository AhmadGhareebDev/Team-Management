"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
  type OnNodeDrag,
  type OnConnect,
  type OnEdgesDelete,
  type OnNodesDelete,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ArrowLeft, ChevronDown, ChevronUp, LayoutDashboard, Plus } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/toast"
import { Input } from "@/components/ui/input"
import { Button, buttonVariants } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import {
  createTask,
  updateTaskPosition,
  updateTaskStatus,
  updateTask,
  setTaskAssignees,
  addTaskDependency,
  removeTaskDependency,
  deleteTask,
} from "@/actions/task"
import { addSubtask, toggleSubtask, deleteSubtask } from "@/actions/subtask"
import { insertTaskSchema, type InsertTaskSchemaType, type UpdateTaskSchemaType } from "@/db/validations"
import { actionErrorMessages } from "@/lib/error-messages"
import type { ProjectTask } from "@/db/queries/task"
import type { ProjectWithMembers } from "@/db/queries/project"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import Link from "next/link"
import TaskNode, { type TaskNodeType, type TaskNodeData, type OptimisticApi } from "@/components/canvas/TaskNode"
import TaskDetailsPanel from "@/components/canvas/TaskDetailsPanel"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"

const MAX_MEMBERS = 4

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

const buildNodes = (
  projectTasks: ProjectTask[],
  projectId: string,
  currentUserId: string | null,
  isManager: boolean
): TaskNodeType[] =>
  projectTasks.map((t) => ({
    id: t.id,
    type: "task",
    position: { x: t.positionX, y: t.positionY },
    data: { task: t, projectId, currentUserId, isManager },
  }))

const buildEdges = (projectTasks: ProjectTask[]): Edge[] =>
  projectTasks.flatMap((t) =>
    t.blockedBy.map((dep) => ({
      id: `dep-${dep.id}`,
      source: dep.dependsOn.id,
      target: t.id,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)", width: 16, height: 16 },
      style: {
        stroke: "var(--primary)",
        strokeWidth: 2,
        strokeDasharray: "6 6",
        animation: "dashdraw 0.8s linear infinite",
        filter: "url(#edge-glow)",
      },
    }))
  )

const canvasErrorMessages: Record<string, string> = {
  UNAUTHENTICATED: "You must be logged in.",
  FORBIDDEN: "You don't have permission to do this.",
  PROJECT_NOT_FOUND: "Project not found.",
  TASK_NOT_FOUND: "Task not found.",
  INVALID_DATA: "Invalid input.",
  SELF_DEPENDENCY: "A task can't depend on itself.",
  ALREADY_DEPENDENT: "This dependency already exists.",
  CYCLIC_DEPENDENCY: "That would create a cycle.",
  DEPENDENCY_NOT_FOUND: "Dependency not found.",
  BLOCKED_DEPENDENCY: "Some dependencies aren't done yet.",
  INVALID_ASSIGNEE: "One of the selected members isn't in this project.",
  SUBTASK_NOT_FOUND: "Subtask not found.",
  INTERNAL_SERVER_ERROR: actionErrorMessages.INTERNAL_SERVER_ERROR,
}

function FocusOnTask({ taskId }: { taskId?: string | null }) {
  const { setCenter, getNode } = useReactFlow()

  useEffect(() => {
    if (!taskId) return
    const node = getNode(taskId)
    if (!node) return

    const timer = window.setTimeout(() => {
      const width = node.measured?.width ?? 220
      const height = node.measured?.height ?? 120
      setCenter(node.position.x + width / 2, node.position.y + height / 2, { zoom: 0.65, duration: 600 })
    }, 60)

    return () => window.clearTimeout(timer)
  }, [taskId, getNode, setCenter])

  return null
}

export default function CanvasStage({
  tasks,
  projectId,
  role,
  project,
  workspaceId,
  currentUserId,
  initialTaskId = null,
}: {
  tasks: ProjectTask[]
  projectId: string
  role: WorkspaceRole | null
  project: NonNullable<ProjectWithMembers>
  workspaceId: string
  currentUserId: string
  initialTaskId?: string | null
}) {
  const router = useRouter()
  const isManager = role === "owner" || role === "admin"
  const [isBarVisible, setIsBarVisible] = useState(true)

  const [isCreatePending, startCreateTransition] = useTransition()
  const [, startDragTransition] = useTransition()
  const [, startEdgeTransition] = useTransition()
  const [, startDeleteTransition] = useTransition()

  const nodeTypes = useMemo(() => ({ task: TaskNode }), [])

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId)

  const form = useForm<InsertTaskSchemaType>({
    resolver: zodResolver(insertTaskSchema),
    mode: "onSubmit",
    defaultValues: { title: "", description: "" },
  })

  const [taskOverrides, setTaskOverrides] = useState<Record<string, Partial<ProjectTask>>>({})
  const [removedTaskIds, setRemovedTaskIds] = useState<Set<string>>(new Set())
  const [lastTasks, setLastTasks] = useState(tasks)

  if (tasks !== lastTasks) {
    setLastTasks(tasks)
    setTaskOverrides((prev) => {
      let changed = false
      const next: Record<string, Partial<ProjectTask>> = {}
      for (const [taskId, patch] of Object.entries(prev)) {
        const serverTask = tasks.find((t) => t.id === taskId)
        if (!serverTask) {
          changed = true
          continue
        }
        const stillDiffers = Object.entries(patch).some(
          ([key, value]) =>
            JSON.stringify((serverTask as Record<string, unknown>)[key]) !== JSON.stringify(value)
        )
        if (stillDiffers) {
          next[taskId] = patch
        } else {
          changed = true
        }
      }
      return changed ? next : prev
    })
    setRemovedTaskIds(new Set())
  }

  const patchTask = (taskId: string, patch: Partial<ProjectTask>) =>
    setTaskOverrides((prev) => ({ ...prev, [taskId]: { ...prev[taskId], ...patch } }))

  const clearPatches = (taskId: string) =>
    setTaskOverrides((prev) => {
      if (!prev[taskId]) return prev
      const next = { ...prev }
      delete next[taskId]
      return next
    })

  const displayedTaskData = useMemo(() => {
    const map: Record<string, ProjectTask> = {}
    for (const t of tasks) {
      if (removedTaskIds.has(t.id)) continue
      map[t.id] = taskOverrides[t.id] ? { ...t, ...taskOverrides[t.id] } : t
    }
    return map
  }, [tasks, taskOverrides, removedTaskIds])

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes(tasks, projectId, currentUserId, isManager))
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(tasks))

  useEffect(() => {
    setNodes(buildNodes(tasks, projectId, currentUserId, isManager))
    setEdges(buildEdges(tasks))
  }, [tasks, projectId, currentUserId, isManager, setNodes, setEdges])

  const handleToggleTaskStatus = (taskId: string, nextStatus: ProjectTask["status"]) => {
    const baseTask = tasks.find((t) => t.id === taskId)
    if (!baseTask) return
    const currentStatus = taskOverrides[taskId]?.status ?? baseTask.status

    const snapshot = { ...displayedTaskData }
    const cascadeSnapshot = {
      ...snapshot,
      [taskId]: { ...(snapshot[taskId] ?? baseTask), status: nextStatus },
    }

    patchTask(taskId, { status: nextStatus })

    const prevCascade: Record<string, ProjectTask["status"]> = {}
    const dependents = edges.filter((e) => e.source === taskId).map((e) => e.target)

    for (const depId of dependents) {
      const depTask = snapshot[depId]
      if (!depTask) continue
      const hasPending = edges.some(
        (e) => e.target === depId && (cascadeSnapshot[e.source]?.status ?? "done") !== "done"
      )
      prevCascade[depId] = depTask.status
      if (hasPending && depTask.status !== "blocked") {
        patchTask(depId, { status: "blocked" })
      } else if (!hasPending && depTask.status === "blocked") {
        patchTask(depId, { status: "todo" })
      }
    }

    startDragTransition(async () => {
      const result = await updateTaskStatus({ projectId, taskId, data: { status: nextStatus } })

      if (result?.error) {
        patchTask(taskId, { status: currentStatus })
        for (const depId of Object.keys(prevCascade)) patchTask(depId, { status: prevCascade[depId] })
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to update task." })
        return
      }
      router.refresh()
    })
  }

  const handleUpdateTaskDetails = (taskId: string, data: UpdateTaskSchemaType) => {
    const baseTask = tasks.find((t) => t.id === taskId)
    if (!baseTask) return
    const prevPatch = taskOverrides[taskId]

    patchTask(taskId, {
      title: data.title ?? baseTask.title,
      description: data.description ?? baseTask.description,
      priority: data.priority ?? baseTask.priority,
      dueDate: data.dueDate === undefined ? baseTask.dueDate : data.dueDate,
    })

    startEdgeTransition(async () => {
      const result = await updateTask({ projectId, taskId, data })

      if (result?.error) {
        if (prevPatch) patchTask(taskId, prevPatch)
        else clearPatches(taskId)
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to update task." })
        return
      }
      toast.add({ type: "success", description: "Task updated." })
      router.refresh()
    })
  }

  const handleSetAssignees = (taskId: string, userIds: string[]) => {
    const baseTask = tasks.find((t) => t.id === taskId)
    if (!baseTask) return
    const prevAssignees = displayedTaskData[taskId]?.assignees ?? baseTask.assignees

    const nextAssignees = project.members
      .filter((m) => userIds.includes(m.user.id))
      .map((m) => ({ user: { id: m.user.id, name: m.user.name, username: m.user.username, avatar_url: m.user.avatar_url } }))

    patchTask(taskId, { assignees: nextAssignees })

    startEdgeTransition(async () => {
      const result = await setTaskAssignees({ projectId, taskId, data: { userIds } })

      if (result?.error) {
        patchTask(taskId, { assignees: prevAssignees })
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to update assignees." })
        return
      }
      toast.add({ type: "success", description: "Assignees updated." })
      router.refresh()
    })
  }

  const handleAddSubtask = async (taskId: string, title: string): Promise<boolean> => {
    const result = await addSubtask({ projectId, taskId, data: { title } })

    if (result?.error) {
      toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to add subtask." })
      return false
    }
    router.refresh()
    return true
  }

  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    const baseTask = tasks.find((t) => t.id === taskId)
    if (!baseTask) return
    const prevSubtasks = displayedTaskData[taskId]?.subtasks ?? baseTask.subtasks

    patchTask(taskId, {
      subtasks: prevSubtasks.map((s) => (s.id === subtaskId ? { ...s, isDone: !s.isDone } : s)),
    })

    startEdgeTransition(async () => {
      const result = await toggleSubtask({ projectId, taskId, subtaskId })
      if (result?.error) {
        patchTask(taskId, { subtasks: prevSubtasks })
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to toggle subtask." })
        return
      }
      router.refresh()
    })
  }

  const handleDeleteSubtask = (taskId: string, subtaskId: string) => {
    const baseTask = tasks.find((t) => t.id === taskId)
    if (!baseTask) return
    const prevSubtasks = displayedTaskData[taskId]?.subtasks ?? baseTask.subtasks

    patchTask(taskId, { subtasks: prevSubtasks.filter((s) => s.id !== subtaskId) })

    startEdgeTransition(async () => {
      const result = await deleteSubtask({ projectId, taskId, subtaskId })
      if (result?.error) {
        patchTask(taskId, { subtasks: prevSubtasks })
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to delete subtask." })
        return
      }
      toast.add({ type: "success", description: "Subtask deleted." })
      router.refresh()
    })
  }

  const handleDeleteTaskOptimistic = (taskId: string) => {
    const snapshotNodes = nodes
    const snapshotEdges = edges
    const snapshotPatch = taskOverrides[taskId]

    setRemovedTaskIds((prev) => {
      const next = new Set(prev)
      next.add(taskId)
      return next
    })
    setNodes((prev) => prev.filter((n) => n.id !== taskId))
    setEdges((prev) => prev.filter((e) => e.source !== taskId && e.target !== taskId))
    setSelectedTaskId((prev) => (prev === taskId ? null : prev))

    startDeleteTransition(async () => {
      const result = await deleteTask({ projectId, taskId })
      if (result?.error) {
        setRemovedTaskIds((prev) => {
          const next = new Set(prev)
          next.delete(taskId)
          return next
        })
        setNodes(snapshotNodes)
        setEdges(snapshotEdges)
        if (snapshotPatch) patchTask(taskId, snapshotPatch)
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to delete task." })
        return
      }
      toast.add({ type: "success", description: "Task deleted." })
      router.refresh()
    })
  }

  const optimisticApi: OptimisticApi = {
    toggleTaskStatus: handleToggleTaskStatus,
    updateTaskDetails: handleUpdateTaskDetails,
    setAssignees: handleSetAssignees,
    addSubtask: handleAddSubtask,
    toggleSubtask: handleToggleSubtask,
    deleteSubtask: handleDeleteSubtask,
    deleteTask: handleDeleteTaskOptimistic,
  }

  const displayNodes = nodes.map((n) => {
    const current = n.data as TaskNodeData
    const patch = taskOverrides[n.id]

    if (patch) {
      return { ...n, data: { ...current, task: { ...current.task, ...patch }, optimistic: optimisticApi } }
    }
    if (current.optimistic === optimisticApi) return n
    return { ...n, data: { ...current, optimistic: optimisticApi } }
  })

  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({})
  const positionSaveTimers = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; position: { x: number; y: number } }>>(new Map())

  const savePosition = async (taskId: string, position: { x: number; y: number }) => {
    const result = await updateTaskPosition({ projectId, taskId, position })

    if (result?.error) {
      const start = dragStartPositions.current[taskId]
      if (start) {
        setNodes((prev) => prev.map((n) => (n.id === taskId ? { ...n, position: { x: start.x, y: start.y } } : n)))
      }
      toast.add({ type: "error", description: "Failed to save position." })
    } else {
      delete dragStartPositions.current[taskId]
    }
  }

  const debouncedPositionSave = (taskId: string, position: { x: number; y: number }) => {
    const existing = positionSaveTimers.current.get(taskId)
    if (existing) clearTimeout(existing.timer)

    const timer = setTimeout(() => {
      positionSaveTimers.current.delete(taskId)
      startDragTransition(() => savePosition(taskId, position))
    }, 1500)

    positionSaveTimers.current.set(taskId, { timer, position })
  }

  useEffect(() => {
    const timers = positionSaveTimers.current
    return () => {
      for (const [taskId, pending] of timers) {
        clearTimeout(pending.timer)
        updateTaskPosition({ projectId, taskId, position: pending.position })
      }
      timers.clear()
    }
  }, [projectId])

  const handleNodeDragStart: OnNodeDrag = (_event, node) => {
    if (!dragStartPositions.current[node.id]) {
      dragStartPositions.current[node.id] = { x: node.position.x, y: node.position.y }
    }
  }

  const handleNodeDragStop: OnNodeDrag = (_event, node) => {
    debouncedPositionSave(node.id, { x: node.position.x, y: node.position.y })
  }

  const handleConnect: OnConnect = (connection) => {
    if (!isManager || !connection.source || !connection.target) return

    const optimisticEdge: Edge = {
      id: `dep-optimistic-${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      type: "smoothstep",
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
      style: {
        stroke: "var(--primary)",
        strokeWidth: 2,
        strokeDasharray: "6 6",
        animation: "dashdraw 0.8s linear infinite",
        filter: "url(#edge-glow)",
      },
    }
    setEdges((prev) => [...prev, optimisticEdge])

    const dependentTask = displayedTaskData[connection.target]
    if (dependentTask) {
      const blockerStatus = displayedTaskData[connection.source]?.status ?? "done"
      const hasOtherPending = edges.some(
        (e) => e.target === connection.target && (displayedTaskData[e.source]?.status ?? "done") !== "done"
      )
      const hasPending = blockerStatus !== "done" || hasOtherPending

      if (hasPending && dependentTask.status !== "blocked") {
        patchTask(connection.target, { status: "blocked" })
      } else if (!hasPending && dependentTask.status === "blocked") {
        patchTask(connection.target, { status: "todo" })
      }
    }

    startEdgeTransition(async () => {
      const result = await addTaskDependency({
        projectId,
        data: { taskId: connection.target!, dependsOnId: connection.source! },
      })

      if (result?.error) {
        setEdges((prev) => prev.filter((e) => e.id !== optimisticEdge.id))
        clearPatches(connection.target!)
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to create dependency." })
        return
      }
      router.refresh()
    })
  }

  const handleEdgesDelete: OnEdgesDelete = (deletedEdges) => {
    if (!isManager) return

    const deletedIds = new Set(deletedEdges.map((e) => e.id))
    const remainingEdges = edges.filter((e) => !deletedIds.has(e.id))
    const affectedDependents = [...new Set(deletedEdges.map((e) => e.target).filter((t): t is string => Boolean(t)))]

    for (const dependentId of affectedDependents) {
      const dependentTask = displayedTaskData[dependentId]
      if (!dependentTask) continue
      const hasPending = remainingEdges.some(
        (e) => e.target === dependentId && (displayedTaskData[e.source]?.status ?? "done") !== "done"
      )
      if (hasPending && dependentTask.status !== "blocked") {
        patchTask(dependentId, { status: "blocked" })
      } else if (!hasPending && dependentTask.status === "blocked") {
        patchTask(dependentId, { status: "todo" })
      }
    }

    startEdgeTransition(async () => {
      const results = await Promise.all(
        deletedEdges.map(async (edge) => {
          const dependencyId = edge.id.replace(/^dep-/, "")
          const result = await removeTaskDependency({ projectId, dependencyId })
          return { edge, result }
        })
      )

      const failed = results.filter((r) => r.result?.error)
      if (failed.length > 0) {
        setEdges((prev) => [...prev, ...failed.map((f) => f.edge)])
        for (const dependentId of affectedDependents) clearPatches(dependentId)
        toast.add({ type: "error", description: "Failed to remove dependency." })
        return
      }
      router.refresh()
    })
  }

  const handleNodesDelete: OnNodesDelete = (deletedNodes) => {
    if (!isManager || deletedNodes.length === 0) return
    for (const n of deletedNodes) handleDeleteTaskOptimistic(n.id)
  }

  const handleAddTask = (data: InsertTaskSchemaType) => {
    startCreateTransition(async () => {
      const result = await createTask({ projectId, data: { title: data.title, description: data.description ?? undefined } })

      if (result?.error) {
        toast.add({ type: "error", description: canvasErrorMessages[result.error] ?? "Failed to create task." })
        return
      }

      form.reset()
      router.refresh()
      toast.add({ type: "success", description: "Task created." })
    })
  }

  const selectedTask = selectedTaskId ? displayedTaskData[selectedTaskId] ?? null : null

  return (
    <div className="relative h-full w-full bg-background select-none cursor-default overflow-hidden">
      <style>{`
        @keyframes dashdraw {
          from { stroke-dashoffset: 24; }
          to { stroke-dashoffset: 0; }
        }
        .react-flow__pane {
          cursor: grab !important;
        }
        .react-flow__pane:active {
          cursor: grabbing !important;
        }
      `}</style>

      {/* Top Bar Wrapper with Collapsible Transition */}
      <div
        className={`absolute inset-x-0 top-0 z-20 transition-transform duration-300 ease-in-out ${
          isBarVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="flex justify-center px-4 pt-4 pointer-events-none">
          <div className="relative pointer-events-auto flex w-full max-w-3xl items-center gap-3 rounded-full border border-border/80 bg-card/85 px-4 py-2 shadow-xl backdrop-blur-md transition-all">
            <Link
              href={`/workspaces/${workspaceId}`}
              className={buttonVariants({ variant: "ghost", size: "icon-sm", className: "rounded-full hover:bg-accent text-muted-foreground hover:text-foreground shrink-0" })}
            >
              <ArrowLeft className="size-4" />
            </Link>

            {isManager && (
              <Link
                href={`/workspaces/${workspaceId}/project/${project.id}/dashboard`}
                className={buttonVariants({
                  variant: "ghost",
                  size: "xs",
                  className:
                    "rounded-full px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground",
                })}
                aria-label="Project dashboard"
                title="Project dashboard"
              >
                <LayoutDashboard className="size-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
            )}

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xs font-semibold text-foreground tracking-tight">{project.name}</h1>
              {project.description && <p className="truncate text-[11px] text-muted-foreground">{project.description}</p>}
            </div>

            {project.members.length > 0 && (
              <div className="group/members relative z-20 shrink-0">
                <AvatarGroup>
                  {project.members.slice(0, MAX_MEMBERS).map((m) => (
                    <ImageKitAvatar
                      key={m.user.id}
                      src={m.user.avatar_url}
                      alt={m.user.name}
                      initials={getInitials(m.user.name)}
                      size={24}
                      className="size-6 rounded-full ring-2 ring-card"
                    />
                  ))}
                  {project.members.length > MAX_MEMBERS && (
                    <AvatarGroupCount className="bg-muted text-muted-foreground ring-2 ring-card text-[10px]">
                      +{project.members.length - MAX_MEMBERS}
                    </AvatarGroupCount>
                  )}
                </AvatarGroup>

                <div className="invisible absolute top-full right-0 z-30 mt-3 min-w-56 rounded-xl border border-border bg-popover/95 p-2 opacity-0 shadow-xl backdrop-blur-md transition-all duration-150 group-hover/members:visible group-hover/members:opacity-100">
                  <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                    {project.members.length} {project.members.length === 1 ? "member" : "members"}
                  </p>
                  <div className="space-y-0.5">
                    {project.members.map((m) => (
                      <div key={m.user.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent hover:text-accent-foreground transition-colors">
                        <ImageKitAvatar
                          src={m.user.avatar_url}
                          alt={m.user.id === currentUserId ? "You" : m.user.name}
                          initials={getInitials(m.user.name)}
                          size={24}
                          className="size-6 rounded-full shrink-0"
                        />
                        <div className="min-w-0 leading-tight">
                          <p className="truncate text-xs font-medium text-popover-foreground">
                            {m.user.id === currentUserId ? "You" : m.user.name}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">@{m.user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isManager && (
              <form onSubmit={form.handleSubmit(handleAddTask)} className="flex shrink-0 items-center gap-1.5 pl-2 border-l border-border/60">
                <div className="relative">
                  <Input
                    {...form.register("title")}
                    placeholder="New task..."
                    className="h-7 w-36 rounded-full bg-background/60 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring border-border/60"
                  />
                  {form.formState.errors.title && (
                    <FieldError
                      errors={[form.formState.errors.title]}
                      className="absolute top-full right-0 z-30 mt-1.5 rounded-md bg-destructive px-2 py-1 text-[10px] text-destructive-foreground shadow-md"
                    />
                  )}
                </div>
                <Button
                  type="submit"
                  size="icon-sm"
                  disabled={isCreatePending}
                  aria-label="Add task"
                  className="size-7 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                >
                  {isCreatePending ? <Spinner className="size-3" /> : <Plus className="size-3.5" />}
                </Button>
              </form>
            )}

            {/* Hide Arrow Button (Centered at the top edge of the bar) */}
            <button
              type="button"
              onClick={() => setIsBarVisible(false)}
              title="Hide Bar"
              className="absolute -top-3 left-1/2 -translate-x-1/2 flex size-6 items-center justify-center rounded-full border border-border/80 bg-card/90 shadow-md backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all pointer-events-auto"
            >
              <ChevronUp className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Show Arrow Button (Popping from top canvas edge when hidden) */}
      {!isBarVisible && (
        <button
          type="button"
          onClick={() => setIsBarVisible(true)}
          title="Show Bar"
          className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex h-6 w-10 items-center justify-center rounded-b-xl border border-t-0 border-border/80 bg-card/90 shadow-lg backdrop-blur-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all"
        >
          <ChevronDown className="size-4" />
        </button>
      )}

      <ReactFlow
        nodes={displayNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onEdgesDelete={handleEdgesDelete}
        onNodesDelete={handleNodesDelete}
        onNodeClick={(_event, node) => setSelectedTaskId(node.id)}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.8, minZoom: 0.3 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={isManager}
        nodesConnectable={isManager}
      >
        <svg className="absolute size-0">
          <defs>
            <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="var(--primary)" floodOpacity="0.7" />
            </filter>
          </defs>
        </svg>

        <Background 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1.5} 
          color="currentColor" 
          className="text-slate-400 dark:text-slate-600 opacity-60" 
        />
        <Controls className="!rounded-lg !border-border/60 bg-card/80! !shadow-md backdrop-blur-md overflow-hidden" />
        <FocusOnTask taskId={initialTaskId} />
      </ReactFlow>

      {selectedTask && (
        <TaskDetailsPanel
          open={true}
          onOpenChange={(open) => {
            if (!open) setSelectedTaskId(null)
          }}
          task={selectedTask}
          currentUserId={currentUserId}
          isManager={isManager}
          members={project.members}
          optimistic={optimisticApi}
        />
      )}
    </div>
  )
}