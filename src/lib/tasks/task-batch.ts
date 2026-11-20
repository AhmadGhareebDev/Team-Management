import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { db } from "@/db"
import { projectMembers, task } from "@/db/schemas"
import { wouldCreateCycle, type DependencyGraph } from "@/lib/dependency-graph"
import { layoutNewTasks } from "@/lib/tasks/layout"

export const TASK_BATCH_MAX_TASKS = 20
export type TaskPriority = "low" | "medium" | "high" | "urgent"

const PRIORITIES = new Set<TaskPriority>(["low", "medium", "high", "urgent"])

export type TaskBatchItem = {
    ref?: string | null
    title: string
    description?: string | null
    priority?: TaskPriority
    dueDate?: Date | null
    assigneeUserIds?: string[]
    dependsOn?: string[]
}

export type PlannedTask = {
    id: string
    ref: string | null
    title: string
    description: string | null
    priority: TaskPriority
    dueDate: Date | null
    positionX: number
    positionY: number
    assigneeUserIds: string[]
    dependsOnTaskIds: string[]
}

export type PlanTaskBatchResult =
    | { ok: true; tasks: PlannedTask[]; existingTitles: Record<string, string> }
    | { ok: false; issues: string[] }

type NormalizedItem = {
    ref: string | null
    title: string
    description: string | null
    priority: TaskPriority
    dueDate: Date | null
    assigneeUserIds: string[]
    dependsOn: string[]
}

export async function planTaskBatch({
    projectId,
    items,
}: {
    projectId: string
    items: TaskBatchItem[]
}): Promise<PlanTaskBatchResult> {
    const issues: string[] = []

    if (items.length === 0) {
        return { ok: false, issues: ["The plan has no tasks."] }
    }

    if (items.length > TASK_BATCH_MAX_TASKS) {
        return { ok: false, issues: [`A plan can create at most ${TASK_BATCH_MAX_TASKS} tasks.`] }
    }

    const [existing, members] = await Promise.all([
        db.query.task.findMany({
            where: eq(task.projectId, projectId),
            columns: { id: true, title: true, positionX: true, positionY: true },
        }),
        db.query.projectMembers.findMany({
            where: eq(projectMembers.projectId, projectId),
            columns: { userId: true },
        }),
    ])

    const existingIds = new Set(existing.map((item) => item.id))
    const existingTitles: Record<string, string> = {}
    for (const item of existing) existingTitles[item.id] = item.title
    const memberIds = new Set(members.map((member) => member.userId))

    const normalized: NormalizedItem[] = []
    const refs = new Set<string>()
    const titles = new Set<string>()

    for (const item of items) {
        const title = item.title?.trim() ?? ""
        if (title.length === 0) {
            issues.push("Every task needs a title.")
            continue
        }
        if (title.length > 255) {
            issues.push(`"${title.slice(0, 40)}…" is longer than 255 characters.`)
        }

        const titleKey = title.toLowerCase()
        if (titles.has(titleKey)) {
            issues.push(`Duplicate title "${title}" in the plan.`)
        }
        titles.add(titleKey)

        const ref = item.ref?.trim() || null
        if (ref) {
            if (existingIds.has(ref)) {
                issues.push(`The ref "${ref}" is already a task id. Use a temp ref like t1.`)
            }
            if (refs.has(ref)) {
                issues.push(`Duplicate ref "${ref}" in the plan.`)
            }
            refs.add(ref)
        }

        const description = item.description?.trim() ?? null
        if (description && description.length > 2000) {
            issues.push(`The description for "${title}" is longer than 2000 characters.`)
        }

        const priority = item.priority ?? "medium"
        if (!PRIORITIES.has(priority)) {
            issues.push(`Unknown priority "${priority}" for "${title}".`)
        }

        const dueDate = item.dueDate ?? null
        if (dueDate && Number.isNaN(dueDate.getTime())) {
            issues.push(`The due date for "${title}" is invalid.`)
        }

        const assigneeUserIds = [...new Set(item.assigneeUserIds ?? [])]
        for (const userId of assigneeUserIds) {
            if (!memberIds.has(userId)) {
                issues.push(`"${title}" is assigned to someone who is not on this project.`)
            }
        }

        normalized.push({
            ref,
            title,
            description,
            priority,
            dueDate,
            assigneeUserIds,
            dependsOn: [...new Set((item.dependsOn ?? []).map((value) => value.trim()).filter(Boolean))],
        })
    }

    if (issues.length > 0) {
        return { ok: false, issues }
    }

    const byRef = new Map<string, NormalizedItem>()
    for (const item of normalized) {
        if (item.ref) byRef.set(item.ref, item)
    }

    for (const item of normalized) {
        for (const dependency of item.dependsOn) {
            if (dependency === item.ref) {
                issues.push(`"${item.title}" cannot depend on itself.`)
                continue
            }
            if (!byRef.has(dependency) && !existingIds.has(dependency)) {
                issues.push(`"${item.title}" depends on an unknown task "${dependency}".`)
            }
        }
    }

    if (issues.length > 0) {
        return { ok: false, issues }
    }

    const graph: DependencyGraph = new Map()
    for (const item of normalized) {
        if (!item.ref) continue
        for (const dependency of item.dependsOn) {
            if (!byRef.has(dependency)) continue
            if (wouldCreateCycle(graph, item.ref, dependency)) {
                return { ok: false, issues: ["The proposed dependencies contain a cycle."] }
            }
            const list = graph.get(item.ref) ?? []
            list.push(dependency)
            graph.set(item.ref, list)
        }
    }

    const ids = normalized.map(() => randomUUID())
    const idByRef = new Map<string, string>()
    normalized.forEach((item, index) => {
        if (item.ref) idByRef.set(item.ref, ids[index])
    })

    const dependsOnByIndex = normalized.map((item) =>
        item.dependsOn.map((dependency) => idByRef.get(dependency) ?? dependency)
    )

    const positions = layoutNewTasks({
        existing: existing.map((item) => ({
            id: item.id,
            positionX: item.positionX,
            positionY: item.positionY,
        })),
        tasks: ids.map((id, index) => ({
            key: id,
            dependsOn: dependsOnByIndex[index],
        })),
    })

    const planned: PlannedTask[] = normalized.map((item, index) => {
        const position = positions.get(ids[index]) ?? { x: 0, y: 0 }

        return {
            id: ids[index],
            ref: item.ref,
            title: item.title,
            description: item.description,
            priority: item.priority,
            dueDate: item.dueDate,
            positionX: position.x,
            positionY: position.y,
            assigneeUserIds: item.assigneeUserIds,
            dependsOnTaskIds: dependsOnByIndex[index],
        }
    })

    return { ok: true, tasks: planned, existingTitles }
}
