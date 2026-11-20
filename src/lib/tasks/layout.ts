const COLUMN_GAP = 320
const ROW_GAP = 190
const X_OVERLAP = 180
const Y_OVERLAP = 120

export type LayoutExistingTask = {
    id: string
    positionX: number
    positionY: number
}

export type LayoutNewTask = {
    key: string
    dependsOn: string[]
}

type Point = { x: number; y: number }

function siblingOffset(index: number): number {
    if (index === 0) return 0
    const step = Math.ceil(index / 2) * ROW_GAP
    return index % 2 === 1 ? step : -step
}

export function layoutNewTasks({
    existing,
    tasks,
}: {
    existing: LayoutExistingTask[]
    tasks: LayoutNewTask[]
}): Map<string, Point> {
    const positions = new Map<string, Point>()
    const existingById = new Map(
        existing.map((task) => [task.id, { x: task.positionX, y: task.positionY } satisfies Point])
    )
    const byKey = new Map(tasks.map((task) => [task.key, task]))
    const siblingCounts = new Map<string, number>()
    const placed: Point[] = existing.map((task) => ({ x: task.positionX, y: task.positionY }))

    const rootX =
        existing.length > 0
            ? Math.max(...existing.map((task) => task.positionX)) + COLUMN_GAP
            : 0
    const rootY = existing.length > 0 ? Math.min(...existing.map((task) => task.positionY)) : 0

    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (key: string) => {
        if (visited.has(key) || visiting.has(key)) return
        visiting.add(key)
        const node = byKey.get(key)
        for (const dependency of node?.dependsOn ?? []) {
            if (byKey.has(dependency)) visit(dependency)
        }
        visiting.delete(key)
        visited.add(key)
        order.push(key)
    }

    for (const task of tasks) visit(task.key)

    const conflicts = (point: Point) =>
        placed.some(
            (other) =>
                Math.abs(other.x - point.x) < X_OVERLAP &&
                Math.abs(other.y - point.y) < Y_OVERLAP
        )

    for (const key of order) {
        const node = byKey.get(key)
        if (!node) continue

        const dependencyPoints = node.dependsOn.flatMap((dependency) => {
            const point = positions.get(dependency) ?? existingById.get(dependency)
            return point ? [point] : []
        })

        const anchored = dependencyPoints.length > 0
        const x = anchored
            ? Math.max(...dependencyPoints.map((point) => point.x)) + COLUMN_GAP
            : rootX
        const anchorY = anchored
            ? dependencyPoints.reduce((sum, point) => sum + point.y, 0) / dependencyPoints.length
            : rootY

        const anchorKey = anchored
            ? [...node.dependsOn].sort().join("|")
            : "__root"
        const siblingIndex = siblingCounts.get(anchorKey) ?? 0
        siblingCounts.set(anchorKey, siblingIndex + 1)

        const point: Point = { x, y: anchorY + siblingOffset(siblingIndex) }
        let guard = 0
        while (conflicts(point) && guard < 100) {
            point.y += ROW_GAP
            guard += 1
        }

        positions.set(key, point)
        placed.push(point)
    }

    return positions
}
