"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type RefObject } from "react"
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
import { useProjectRealtime } from "@/components/canvas/useProjectRealtime"
import {
  buildEdges,
  buildNodes,
  mergeCanvasEdges,
  mergeCanvasNodes,
  removeDeleted,
} from "@/components/canvas/canvas-graph"
import { toProjectTask } from "@/lib/canvas-payload"
import type { CanvasEvent } from "@/lib/ably-channel"
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
import { insertTaskSchema, type InsertTaskSchemaType, type UpdateTaskSchemaType } from "@/db/validations"
import { actionErrorMessages } from "@/lib/error-messages"
import type { ProjectTask } from "@/db/queries/task"
import type { ProjectWithMembers } from "@/db/queries/project"
import type { WorkspaceRole } from "@/components/web/AuthGateProvider"
import Link from "next/link"
import TaskNode, { type TaskNodeData, type OptimisticApi } from "@/components/canvas/TaskNode"
import TaskDetailsPanel from "@/components/canvas/TaskDetailsPanel"
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar"
import { ImageKitAvatar } from "@/components/web/ImageKitAvatar"
import { cn } from "@/lib/utils"

const MAX_MEMBERS = 4

const getInitials = (name: string) =>
  name.trim().split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()

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

function FitOnGrowth({ count }: { count: number }) {
  const { fitView } = useReactFlow()
  const previous = useRef(count)

  useEffect(() => {
    if (count > previous.current) {
      previous.current = count
      const timer = window.setTimeout(() => {
        void fitView({ padding: 0.2, duration: 500 })
      }, 160)
      return () => window.clearTimeout(timer)
    }
    previous.current = count
  }, [count, fitView])

  return null
}

function FitOnResize({
  containerRef,
}: {
  containerRef: RefObject<HTMLDivElement | null>
}) {
  const { fitView } = useReactFlow()

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    let first = true
    let timer: number | undefined

    const observer = new ResizeObserver(() => {
      if (first) {
        first = false
        return
      }

      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        void fitView({ padding: 0.2, duration: 250 })
      }, 220)
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
    }
  }, [containerRef, fitView])

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
  const [isMembersOpen, setIsMembersOpen] = useState(false)

  const [isCreatePending, startCreateTransition] = useTransition()
  const [, startDragTransition] = useTransition()
  const [, startEdgeTransition] = useTransition()
  const [, startDeleteTransition] = useTransition()

  const nodeTypes = useMemo(() => ({ task: TaskNode }), [])
  const canvasRef = useRef<HTMLDivElement>(null)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(initialTaskId)

  const boardStats = useMemo(() => {
    let blocked = 0
    let done = 0
    for (const item of tasks) {
      if (item.status === "blocked") blocked += 1
      else if (item.status === "done") done += 1
    }
    return { total: tasks.length, blocked, done }
  }, [tasks])

  const focusQuickTask = useCallback(() => {
    const focus = () => document.getElementById("quick-task-input")?.focus()
    if (isBarVisible) {
      window.setTimeout(focus, 60)
      return
    }
    setIsBarVisible(true)
    window.setTimeout(focus, 320)
  }, [isBarVisible])

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

  // Tracks the newest updatedAt applied per task so a message that was already
  // superseded by a router.refresh() does not roll the node backwards.
  const appliedAtRef = useRef<Map<string, number>>(new Map())

  const handleCanvasEvent = (event: CanvasEvent) => {
    if (event.kind === "delete") {
      setRemovedTaskIds((prev) => {
        const next = new Set(prev)
        let changed = false
        for (const id of event.taskIds) {
          if (!next.has(id)) {
            next.add(id)
            changed = true
          }
          appliedAtRef.current.delete(id)
        }
        return changed ? next : prev
      })
      const remaining = removeDeleted(nodes, edges, event.taskIds)
      setNodes(remaining.nodes)
      setEdges(remaining.edges)
      return
    }

    const incoming: ProjectTask[] = []
    for (const payload of event.tasks) {
      const seen = appliedAtRef.current.get(payload.id) ?? 0
      if (new Date(payload.updatedAt).getTime() <= seen) continue
      appliedAtRef.current.set(payload.id, new Date(payload.updatedAt).getTime())
      incoming.push(toProjectTask(payload))
    }

    if (incoming.length === 0) return

    for (const remote of incoming) {
      patchTask(remote.id, remote)
    }

    setNodes((prev) => mergeCanvasNodes(prev, incoming, projectId, currentUserId, isManager))
    setEdges((prev) => mergeCanvasEdges(prev, incoming))
  }

  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({})
  const positionSaveTimers = useRef<Map<string, { timer: ReturnType<typeof setTimeout>; position: { x: number; y: number } }>>(new Map())

  // Resync when the socket comes back or the tab regains focus: anything changed
  // while we were disconnected was never delivered, so the board is stale. A
  // refresh re-renders the server props, and the effect above rebuilds nodes and
  // edges from them. Skipped while a position save is still in flight, because
  // positions are never broadcast and the server copy can be briefly older.
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleResync = useCallback(() => {
    if (positionSaveTimers.current.size > 0) return

    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current)
    resyncTimerRef.current = setTimeout(() => {
      resyncTimerRef.current = null
      router.refresh()
    }, 300)
  }, [router])

  useEffect(() => {
    return () => {
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current)
    }
  }, [])

  const realtimeElements = useProjectRealtime(projectId, handleCanvasEvent, handleResync)

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
      markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)" },
      style: {
        stroke: "var(--primary)",
        strokeWidth: 2,
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
    <div className="relative flex h-full w-full overflow-hidden bg-background">
      <div
        ref={canvasRef}
        className="relative h-full min-w-0 flex-1 cursor-default overflow-hidden select-none"
      >
      {realtimeElements}
      <style>{`
        .react-flow {
          touch-action: none;
        }
        .react-flow__pane {
          cursor: grab !important;
        }
        .react-flow__pane:active {
          cursor: grabbing !important;
        }
      `}</style>

      {/* Toolbar */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-20 transition-transform duration-300 ease-in-out motion-reduce:transition-none",
          isBarVisible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <div className="px-3 pt-3">
          <div className="border border-border bg-card select-text">
            <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
              <Link
                href={`/workspaces/${workspaceId}`}
                aria-label="Back to workspace"
                title="Back to workspace"
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon-sm",
                  className:
                    "rounded-none text-muted-foreground hover:bg-accent hover:text-foreground",
                })}
              >
                <ArrowLeft className="size-4" />
              </Link>

              <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" />

              {isManager && (
                <Link
                  href={`/workspaces/${workspaceId}/project/${project.id}/dashboard`}
                  aria-label="Project dashboard"
                  title="Project dashboard"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "xs",
                    className:
                      "rounded-none px-2.5 text-muted-foreground hover:bg-accent hover:text-foreground max-sm:hidden",
                  })}
                >
                  <LayoutDashboard className="size-4" />
                  <span className="hidden xl:inline">Dashboard</span>
                </Link>
              )}

              <div className="min-w-0 flex-1 px-1">
                <div className="flex items-center gap-2">
                  <span className="size-1.5 shrink-0 bg-primary" aria-hidden="true" />
                  <h1 className="truncate text-xs font-semibold tracking-tight text-foreground">
                    {project.name}
                  </h1>
                </div>
                <p className="mt-0.5 truncate text-[10px] leading-relaxed text-muted-foreground">
                  <span>{boardStats.total} tasks</span>
                  <span className="mx-1">·</span>
                  <span className={boardStats.blocked > 0 ? "text-destructive" : undefined}>
                    {boardStats.blocked} blocked
                  </span>
                  <span className="mx-1">·</span>
                  <span>{boardStats.done} done</span>
                  {project.description && (
                    <span className="hidden xl:inline"> · {project.description}</span>
                  )}
                </p>
              </div>

              {project.members.length > 0 && (
                <div
                  className="group/members relative z-20 hidden shrink-0 sm:block"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setIsMembersOpen((open) => !open)}
                    aria-label="Show project members"
                    aria-expanded={isMembersOpen}
                    aria-haspopup="dialog"
                    className="flex cursor-pointer focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <AvatarGroup>
                      {project.members.slice(0, MAX_MEMBERS).map((member) => (
                        <ImageKitAvatar
                          key={member.user.id}
                          src={member.user.avatar_url}
                          alt={member.user.name}
                          initials={getInitials(member.user.name)}
                          size={24}
                          className="size-6 rounded-full ring-2 ring-card"
                        />
                      ))}
                      {project.members.length > MAX_MEMBERS && (
                        <AvatarGroupCount className="bg-muted text-[10px] text-muted-foreground ring-2 ring-card">
                          +{project.members.length - MAX_MEMBERS}
                        </AvatarGroupCount>
                      )}
                    </AvatarGroup>
                  </button>

                  <div
                    className={cn(
                      "absolute top-full right-0 z-30 mt-2 max-h-80 min-w-56 overflow-y-auto border border-border bg-popover p-2 transition-opacity canvas-scroll",
                      isMembersOpen
                        ? "visible opacity-100"
                        : "invisible opacity-0 group-hover/members:visible group-hover/members:opacity-100"
                    )}
                  >
                    <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                      {project.members.length}{" "}
                      {project.members.length === 1 ? "member" : "members"}
                    </p>
                    <div className="space-y-0.5">
                      {project.members.map((member) => (
                        <div
                          key={member.user.id}
                          className="flex items-center gap-2.5 px-2 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <ImageKitAvatar
                            src={member.user.avatar_url}
                            alt={member.user.id === currentUserId ? "You" : member.user.name}
                            initials={getInitials(member.user.name)}
                            size={24}
                            className="size-6 shrink-0 rounded-full"
                          />
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-xs font-medium text-popover-foreground">
                              {member.user.id === currentUserId ? "You" : member.user.name}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              @{member.user.username}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isManager && (
                <form
                  onSubmit={form.handleSubmit(handleAddTask)}
                  className="order-last flex w-full shrink-0 items-center gap-1.5 border-t border-border/60 pt-1.5 sm:order-none sm:w-auto sm:border-0 sm:border-l sm:pt-0 sm:pl-2"
                >
                  <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none">
                    <Input
                      {...form.register("title")}
                      id="quick-task-input"
                      aria-label="New task title"
                      placeholder="Add a task…"
                      className="h-7 w-full rounded-none border-border/60 bg-background/60 px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    {form.formState.errors.title && (
                      <FieldError
                        errors={[form.formState.errors.title]}
                        className="absolute top-full right-0 z-30 mt-1.5 rounded-none bg-destructive px-2 py-1 text-[10px] text-destructive-foreground shadow-md"
                      />
                    )}
                  </div>
                  <Button
                    type="submit"
                    size="icon-sm"
                    disabled={isCreatePending}
                    aria-label="Add task"
                    title="Add task"
                    className="size-7 shrink-0 rounded-none bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isCreatePending ? (
                      <Spinner className="size-3" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                  </Button>
                </form>
              )}

              <button
                type="button"
                onClick={() => setIsBarVisible(false)}
                aria-label="Hide toolbar"
                title="Hide toolbar"
                className="flex size-9 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none lg:size-7"
              >
                <ChevronUp className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {!isBarVisible && (
        <button
          type="button"
          onClick={() => setIsBarVisible(true)}
          aria-label="Show toolbar"
          title="Show toolbar"
          className="absolute top-0 left-1/2 z-20 flex h-9 w-32 -translate-x-1/2 items-center justify-center gap-1.5 border-x border-b border-border bg-card text-[10px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none lg:h-7 lg:w-28"
        >
          <ChevronDown className="size-3.5" />
          Toolbar
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
        onPaneClick={() => setSelectedTaskId(null)}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.8, minZoom: 0.3 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={isManager}
        nodesConnectable={isManager}
        onlyRenderVisibleElements
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="currentColor"
          className="text-border"
        />
        <Controls position="bottom-right" showInteractive={false} />
        <FocusOnTask taskId={initialTaskId} />
        <FitOnGrowth count={tasks.length} />
        <FitOnResize containerRef={canvasRef} />
      </ReactFlow>

      {tasks.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 pt-24 pb-20">
          <div className="pointer-events-auto w-full max-w-sm border border-border bg-card p-6 text-center">
            <div className="mx-auto flex size-10 items-center justify-center border border-border bg-muted/20">
              <LayoutDashboard className="size-5 text-primary" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-foreground">
              This board is a blank canvas
            </h2>
            <p className="mx-auto mt-1.5 max-w-72 text-xs leading-relaxed text-muted-foreground">
              Add the first task to start shaping this board.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              {isManager && (
                <Button
                  size="sm"
                  onClick={focusQuickTask}
                  className="rounded-none"
                >
                  <Plus className="size-3.5" />
                  Add first task
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 p-3">
        <div className="pointer-events-auto flex items-center gap-2 border border-border bg-card px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          <span className="size-1.5 shrink-0 bg-primary" aria-hidden="true" />
          <span>{boardStats.total} tasks</span>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <span className={boardStats.blocked > 0 ? "text-destructive" : undefined}>
            {boardStats.blocked} blocked
          </span>
          <span className="h-3 w-px bg-border" aria-hidden="true" />
          <span>{boardStats.done} done</span>
        </div>
      </div>

      {selectedTask && (
        <TaskDetailsPanel
          key={selectedTask.id}
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
    </div>
  )
}