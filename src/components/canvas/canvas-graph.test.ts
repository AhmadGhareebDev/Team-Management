import { describe, expect, it } from "vitest"
import {
  buildEdges,
  buildEdgesForTask,
  buildNodes,
  mergeCanvasEdges,
  mergeCanvasNodes,
  removeDeleted,
} from "@/components/canvas/canvas-graph"

/**
 * These helpers are what the realtime path depends on. A task created in another
 * tab only appears if `mergeCanvasNodes` adds a node for it, and a dependency
 * added in another tab only appears if `mergeCanvasEdges` adds the edge. Both
 * are easy to break in a way that looks fine locally and fails only with a
 * second user, which is exactly the class of bug that survives manual testing.
 */

type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "blocked"

type BlockedBy = {
  id: string
  dependsOn: { id: string; title: string; status: TaskStatus; dueDate: Date | null }
}

const makeTask = (over: Partial<Task> = {}): Task => ({
  id: "t1",
  projectId: "p1",
  title: "Task one",
  description: null,
  status: "todo",
  priority: "medium",
  positionX: 10,
  positionY: 20,
  dueDate: null,
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  assignees: [],
  blockedBy: [],
  ...over,
} as unknown as Task)

/** Local alias so the fixtures stay readable. */
type Task = NonNullable<Parameters<typeof buildNodes>[0]>[number]

describe("buildNodes", () => {
  it("maps position and node type from each task", () => {
    const nodes = buildNodes([makeTask({ id: "a", positionX: 5, positionY: 7 })], "p1", "u1", true)

    expect(nodes).toHaveLength(1)
    expect(nodes[0]).toMatchObject({
      id: "a",
      type: "task",
      position: { x: 5, y: 7 },
    })
  })

  it("carries project, user and manager flag onto node data", () => {
    const [node] = buildNodes([makeTask()], "p9", "u9", true)

    expect(node.data).toMatchObject({
      projectId: "p9",
      currentUserId: "u9",
      isManager: true,
    })
  })

  it("preserves a null current user for a signed out viewer", () => {
    const [node] = buildNodes([makeTask()], "p1", null, false)
    expect(node.data).toMatchObject({ currentUserId: null, isManager: false })
  })

  it("returns an empty list for no tasks", () => {
    expect(buildNodes([], "p1", "u1", false)).toEqual([])
  })
})

describe("buildEdges", () => {
  it("creates one edge per dependency, from the blocker to the blocked task", () => {
    const blocked: BlockedBy[] = [{ id: "d1", dependsOn: { id: "dep1", title: "D", status: "done", dueDate: null } }]

    const edges = buildEdgesForTask(makeTask({ id: "task", blockedBy: blocked }))

    expect(edges).toHaveLength(1)
    expect(edges[0]).toMatchObject({
      id: "dep-d1",
      source: "dep1",
      target: "task",
    })
  })

  it("creates no edges for a task with no dependencies", () => {
    expect(buildEdgesForTask(makeTask())).toEqual([])
  })

  it("flattens edges across every task", () => {
    const tasks = [
      makeTask({
        id: "t1",
        blockedBy: [{ id: "d1", dependsOn: { id: "a", title: "A", status: "todo", dueDate: null } }],
      }),
      makeTask({
        id: "t2",
        blockedBy: [
          { id: "d2", dependsOn: { id: "b", title: "B", status: "todo", dueDate: null } },
          { id: "d3", dependsOn: { id: "c", title: "C", status: "todo", dueDate: null } },
        ],
      }),
    ]

    expect(buildEdges(tasks).map((e) => e.id)).toEqual(["dep-d1", "dep-d2", "dep-d3"])
  })
})

describe("mergeCanvasNodes", () => {
  const projectId = "p1"
  const userId = "u1"

  it("adds a node for a task created by someone else", () => {
    const prev = buildNodes([makeTask({ id: "t1" })], projectId, userId, false)

    const next = mergeCanvasNodes(
      prev,
      [makeTask({ id: "t2", title: "Brand new" })],
      projectId,
      userId,
      false
    )

    expect(next.map((n) => n.id)).toEqual(["t1", "t2"])
  })

  it("does not add a duplicate node for a task that already exists", () => {
    const prev = buildNodes([makeTask({ id: "t1" })], projectId, userId, false)

    const next = mergeCanvasNodes(prev, [makeTask({ id: "t1" })], projectId, userId, false)

    expect(next).toHaveLength(1)
  })

  it("patches an existing node's data rather than replacing the node", () => {
    const prev = buildNodes([makeTask({ id: "t1", status: "todo", positionX: 10 })], projectId, userId, false)

    const [node] = mergeCanvasNodes(
      prev,
      [makeTask({ id: "t1", status: "done", title: "Renamed" })],
      projectId,
      userId,
      false
    )

    expect(node.id).toBe("t1")
    expect((node.data as { task: Task }).task.status).toBe("done")
    expect((node.data as { task: Task }).task.title).toBe("Renamed")
  })

  it("leaves the node position alone, since positions are not broadcast", () => {
    // A remote payload carries positionX/Y, but a position change never
    // publishes an event. Positions therefore only arrive through a
    // router.refresh() rebuilding nodes via buildNodes. Applying them here would
    // make a node jump under the local user's cursor mid drag.
    const prev = buildNodes([makeTask({ id: "t1", positionX: 10, positionY: 20 })], projectId, userId, false)

    const [node] = mergeCanvasNodes(prev, [makeTask({ id: "t1", positionX: 999 })], projectId, userId, false)

    expect(node.position).toEqual({ x: 10, y: 20 })
    // The task record still carries the new value for anything reading it.
    expect((node.data as { task: Task }).task.positionX).toBe(999)
  })

  it("keeps node data the server payload does not carry", () => {
    const prev = buildNodes([makeTask({ id: "t1" })], projectId, userId, true)

    const [node] = mergeCanvasNodes(prev, [makeTask({ id: "t1", title: "Renamed" })], projectId, userId, true)

    expect(node.data).toMatchObject({ projectId, isManager: true })
    expect((node.data as { task: Task }).task.title).toBe("Renamed")
  })

  it("leaves untouched nodes alone", () => {
    const prev = buildNodes([makeTask({ id: "t1" }), makeTask({ id: "t2" })], projectId, userId, false)

    const next = mergeCanvasNodes(prev, [makeTask({ id: "t1", title: "Changed" })], projectId, userId, false)

    expect(next[1].data).toBe(prev[1].data)
  })

  it("returns the previous list unchanged for an empty payload", () => {
    const prev = buildNodes([makeTask({ id: "t1" })], projectId, userId, false)
    expect(mergeCanvasNodes(prev, [], projectId, userId, false)).toBe(prev)
  })

  it("handles a mixed payload of one new and one existing task", () => {
    const prev = buildNodes([makeTask({ id: "t1" })], projectId, userId, false)

    const next = mergeCanvasNodes(
      prev,
      [makeTask({ id: "t1", status: "done" }), makeTask({ id: "t3" })],
      projectId,
      userId,
      false
    )

    expect(next.map((n) => n.id)).toEqual(["t1", "t3"])
    expect((next[0].data as { task: Task }).task.status).toBe("done")
  })
})

describe("mergeCanvasEdges", () => {
  const taskWithDeps = (id: string, rows: string[]) =>
    makeTask({
      id,
      blockedBy: rows.map((r) => ({
        id: r,
        dependsOn: { id: r.replace("d", "dep"), title: r, status: "todo", dueDate: null },
      })),
    })

  it("adds an edge for a dependency created by someone else", () => {
    const prev = buildEdges([taskWithDeps("t1", [])])

    const next = mergeCanvasEdges(prev, [taskWithDeps("t1", ["d1"])])

    expect(next.map((e) => e.id)).toEqual(["dep-d1"])
  })

  it("removes an edge whose dependency was removed elsewhere", () => {
    const prev = buildEdges([taskWithDeps("t1", ["d1", "d2"])])

    const next = mergeCanvasEdges(prev, [taskWithDeps("t1", ["d1"])])

    expect(next.map((e) => e.id)).toEqual(["dep-d1"])
  })

  it("removes every edge for a task that is no longer blocked", () => {
    const prev = buildEdges([taskWithDeps("t1", ["d1", "d2"])])

    expect(mergeCanvasEdges(prev, [taskWithDeps("t1", [])])).toEqual([])
  })

  it("does not duplicate an edge that is already present", () => {
    const prev = buildEdges([taskWithDeps("t1", ["d1"])])

    const next = mergeCanvasEdges(prev, [taskWithDeps("t1", ["d1"])])

    expect(next).toHaveLength(1)
  })

  it("leaves edges of other tasks alone", () => {
    const prev = buildEdges([taskWithDeps("t1", ["d1"]), taskWithDeps("t2", ["d2"])])

    const next = mergeCanvasEdges(prev, [taskWithDeps("t1", [])])

    expect(next.map((e) => e.id)).toEqual(["dep-d2"])
  })

  it("keeps optimistic placeholder edges when a task is not in the payload", () => {
    const placeholder = {
      id: "dep-optimistic-t1-depX",
      source: "depX",
      target: "t1",
    }

    const next = mergeCanvasEdges([placeholder], [taskWithDeps("t2", ["d9"])])

    expect(next.map((e) => e.id)).toContain("dep-optimistic-t1-depX")
  })

  it("returns the previous list unchanged for an empty payload", () => {
    const prev = buildEdges([taskWithDeps("t1", ["d1"])])
    expect(mergeCanvasEdges(prev, [])).toBe(prev)
  })
})

describe("removeDeleted", () => {
  const projectId = "p1"
  const userId = "u1"

  it("drops the deleted nodes and every edge touching them", () => {
    const nodes = buildNodes(
      [makeTask({ id: "t1" }), makeTask({ id: "t2" }), makeTask({ id: "t3" })],
      projectId,
      userId,
      false
    )
    const edges = [
      { id: "dep-d1", source: "t1", target: "t2" },
      { id: "dep-d2", source: "t3", target: "t2" },
      { id: "dep-d3", source: "t2", target: "t3" },
    ]

    const result = removeDeleted(nodes, edges, ["t1"])

    expect(result.nodes.map((n) => n.id)).toEqual(["t2", "t3"])
    // dep-d1 touches t1, dep-d2 and dep-d3 do not.
    expect(result.edges.map((e) => e.id)).toEqual(["dep-d2", "dep-d3"])
  })

  it("is a no-op when nothing was deleted", () => {
    const nodes = buildNodes([makeTask({ id: "t1" })], projectId, userId, false)

    const result = removeDeleted(nodes, [], [])

    expect(result.nodes).toEqual(nodes)
    expect(result.edges).toEqual([])
  })

  it("removes an edge that points at a deleted task only", () => {
    const edges = [
      { id: "dep-d1", source: "kept", target: "gone" },
      { id: "dep-d2", source: "kept", target: "alsoKept" },
    ]

    expect(removeDeleted([], edges, ["gone"]).edges.map((e) => e.id)).toEqual(["dep-d2"])
  })
})