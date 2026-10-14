import { MarkerType, type Edge } from "@xyflow/react"
import type { ProjectTask } from "@/db/queries/task"
import type { TaskNodeData, TaskNodeType } from "@/components/canvas/TaskNode"

export const buildNodes = (
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

export const buildEdgesForTask = (t: ProjectTask): Edge[] =>
  t.blockedBy.map((dep) => ({
    id: `dep-${dep.id}`,
    source: dep.dependsOn.id,
    target: t.id,
    type: "smoothstep",
    markerEnd: { type: MarkerType.ArrowClosed, color: "var(--primary)", width: 16, height: 16 },
    style: {
      stroke: "var(--primary)",
      strokeWidth: 2,
    },
  }))

export const buildEdges = (projectTasks: ProjectTask[]): Edge[] =>
  projectTasks.flatMap(buildEdgesForTask)

/**
 * Folds remotely received tasks into the current node list: existing nodes are
 * patched, tasks that have no node yet get one. Without the second half a task
 * created by someone else stays invisible, because nodes are otherwise only
 * built from the tasks prop, which only changes on a server render.
 */
export function mergeCanvasNodes(
  prev: TaskNodeType[],
  incoming: ProjectTask[],
  projectId: string,
  currentUserId: string | null,
  isManager: boolean
): TaskNodeType[] {
  if (incoming.length === 0) return prev

  const known = new Set(prev.map((n) => n.id))
  const byId = new Map(incoming.map((t) => [t.id, t]))

  const updated = prev.map((n) => {
    const remote = byId.get(n.id)
    if (!remote) return n
    const current = n.data as TaskNodeData
    return { ...n, data: { ...current, task: { ...current.task, ...remote } } }
  })

  const created = incoming
    .filter((t) => !known.has(t.id))
    .flatMap((t) => buildNodes([t], projectId, currentUserId, isManager))

  return created.length ? [...updated, ...created] : updated
}

/** Rebuilds the edges owned by the received tasks and drops removed ones. */
export function mergeCanvasEdges(prev: Edge[], incoming: ProjectTask[]): Edge[] {
  if (incoming.length === 0) return prev

  const next = new Map(prev.map((e) => [e.id, e]))

  for (const remote of incoming) {
    const wanted = buildEdgesForTask(remote)

    // Compare against this task's own new edge ids, not against `next`, which
    // is seeded from prev and would therefore still hold the stale entries.
    const wantedIds = new Set(wanted.map((e) => e.id))

    for (const edge of prev) {
      if (edge.target === remote.id && !wantedIds.has(edge.id)) {
        next.delete(edge.id)
      }
    }

    for (const edge of wanted) {
      next.set(edge.id, edge)
    }
  }

  return [...next.values()]
}

/** Removes nodes and every edge touching a deleted task. */
export function removeDeleted(
  prevNodes: TaskNodeType[],
  prevEdges: Edge[],
  taskIds: string[]
) {
  return {
    nodes: prevNodes.filter((n) => !taskIds.includes(n.id)),
    edges: prevEdges.filter(
      (e) => !taskIds.includes(e.source) && !taskIds.includes(e.target)
    ),
  }
}