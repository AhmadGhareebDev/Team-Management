/**
 * Dependency graph helpers for the task board.
 *
 * Extracted from `addTaskDependency`, where cycle detection was a local closure
 * and therefore unreachable from any test. It is the single guard standing
 * between a user and a graph they cannot render, so it earns a suite.
 */

/** Adjacency list: task id -> ids it directly depends on. */
export type DependencyGraph = Map<string, string[]>

export function buildDependencyGraph(
  rows: { taskId: string; dependsOnId: string }[]
): DependencyGraph {
  const graph: DependencyGraph = new Map()

  for (const row of rows) {
    const list = graph.get(row.taskId) ?? []
    list.push(row.dependsOnId)
    graph.set(row.taskId, list)
  }

  return graph
}

/**
 * True when `start` can already reach `blocked` by following dependencies.
 *
 * Adding the edge `blocked -> start` is only legal when this returns false;
 * otherwise the board would contain a cycle. Breadth-first with a visited set,
 * so a diamond (A depends on both B and C, both depend on D) terminates instead
 * of looping.
 */
export function createsCycle(
  graph: DependencyGraph,
  start: string,
  blocked: string
): boolean {
  const queue = [start]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === blocked) return true
    if (visited.has(current)) continue
    visited.add(current)

    for (const next of graph.get(current) ?? []) {
      queue.push(next)
    }
  }

  return false
}

/**
 * Would adding `taskId -> dependsOnId` create a cycle? Walks forward from
 * `dependsOnId` and reports whether it can already reach `taskId`.
 */
export function wouldCreateCycle(
  graph: DependencyGraph,
  taskId: string,
  dependsOnId: string
): boolean {
  return createsCycle(graph, dependsOnId, taskId)
}