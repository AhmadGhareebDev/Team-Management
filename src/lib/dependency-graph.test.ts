import { describe, expect, it } from "vitest"
import {
  buildDependencyGraph,
  createsCycle,
  wouldCreateCycle,
} from "@/lib/dependency-graph"

/** Shorthand: rows are stored as taskId -> dependsOnId. */
const graph = (rows: [string, string][]) =>
  buildDependencyGraph(rows.map(([taskId, dependsOnId]) => ({ taskId, dependsOnId })))

describe("buildDependencyGraph", () => {
  it("groups every dependency of a task", () => {
    const g = graph([
      ["c", "a"],
      ["c", "b"],
      ["b", "a"],
    ])

    expect(g.get("c")).toEqual(["a", "b"])
    expect(g.get("b")).toEqual(["a"])
  })

  it("keeps duplicate edges as duplicates rather than silently deduping", () => {
    // A unique index stops duplicates at the database; the graph is not the
    // place that decision is made.
    expect(graph([["b", "a"], ["b", "a"]]).get("b")).toHaveLength(2)
  })

  it("returns an empty graph for no rows", () => {
    expect(graph([]).size).toBe(0)
  })
})

describe("createsCycle", () => {
  it("reports no cycle when start cannot reach blocked", () => {
    const g = graph([["b", "a"]])
    expect(createsCycle(g, "a", "b")).toBe(false)
  })

  it("reports a cycle when start is blocked itself", () => {
    const g = graph([["b", "a"]])
    expect(createsCycle(g, "b", "b")).toBe(true)
  })

  it("detects a direct cycle", () => {
    // b -> a already, so adding a -> b would close a <-> b.
    expect(wouldCreateCycle(graph([["b", "a"]]), "a", "b")).toBe(true)
  })

  it("detects a transitive cycle", () => {
    // c -> b -> a. Adding a -> c must be rejected.
    const g = graph([
      ["c", "b"],
      ["b", "a"],
    ])
    expect(wouldCreateCycle(g, "a", "c")).toBe(true)
  })

  it("detects a longer transitive cycle", () => {
    // d -> c -> b -> a, adding a -> d.
    const g = graph([
      ["d", "c"],
      ["c", "b"],
      ["b", "a"],
    ])
    expect(wouldCreateCycle(g, "a", "d")).toBe(true)
  })

  it("allows a diamond, which revisits nodes but is not a cycle", () => {
    // b -> a and c -> a, plus b -> c. Adding d -> a is fine and must not be
    // mistaken for a cycle just because a is reached by two paths.
    const g = graph([
      ["b", "a"],
      ["c", "a"],
      ["b", "c"],
    ])

    expect(createsCycle(g, "a", "d")).toBe(false)
    expect(wouldCreateCycle(g, "d", "a")).toBe(false)
    expect(wouldCreateCycle(g, "d", "b")).toBe(false)
  })

  it("terminates on a diamond rather than looping", () => {
    // Without a visited set this walks b -> a, b -> c -> a, b -> c forever.
    const g = graph([
      ["b", "a"],
      ["b", "c"],
      ["c", "a"],
      ["a", "b"],
    ])

    expect(createsCycle(g, "b", "missing")).toBe(false)
  })

  it("rejects a self edge", () => {
    expect(wouldCreateCycle(graph([]), "a", "a")).toBe(true)
  })

  it("rejects the reverse of an existing edge", () => {
    // a -> b exists; adding b -> a would close the pair.
    expect(wouldCreateCycle(graph([["a", "b"]]), "b", "a")).toBe(true)
  })

  it("allows an unrelated task to depend on anything", () => {
    const g = graph([
      ["b", "a"],
      ["c", "b"],
    ])
    expect(wouldCreateCycle(g, "z", "a")).toBe(false)
  })
})