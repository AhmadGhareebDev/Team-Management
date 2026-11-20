import { randomUUID } from "crypto"
import { db } from "@/db"
import { task, taskAssignees, taskDependencies } from "@/db/schemas"
import {
    planTaskBatch,
    type PlannedTask,
    type PlanTaskBatchResult,
    type TaskBatchItem,
} from "@/lib/tasks/task-batch"

export type CreateTasksActor = {
    userId: string
    canManage: boolean
}

export type WriteTaskBatchResult =
    | { ok: true; taskIds: string[] }
    | { ok: false; error: "FORBIDDEN" | "INTERNAL_SERVER_ERROR" }

type BatchQuery = Parameters<typeof db.batch>[0][number]

export async function writeTaskBatch({
    projectId,
    actor,
    plan,
}: {
    projectId: string
    actor: CreateTasksActor
    plan: Extract<PlanTaskBatchResult, { ok: true }>
}): Promise<WriteTaskBatchResult> {
    if (!actor.canManage) {
        return { ok: false, error: "FORBIDDEN" }
    }

    const tasks: PlannedTask[] = plan.tasks
    const dependencyRows = tasks.flatMap((item) =>
        item.dependsOnTaskIds.map((dependsOnId) => ({
            id: randomUUID(),
            taskId: item.id,
            dependsOnId,
        }))
    )
    const assigneeRows = tasks.flatMap((item) =>
        item.assigneeUserIds.map((userId) => ({
            id: randomUUID(),
            taskId: item.id,
            userId,
        }))
    )

    const queries: BatchQuery[] = [
        ...tasks.map((item) =>
            db.insert(task).values({
                id: item.id,
                projectId,
                createdBy: actor.userId,
                title: item.title,
                description: item.description,
                priority: item.priority,
                dueDate: item.dueDate,
                positionX: item.positionX,
                positionY: item.positionY,
            })
        ),
        ...dependencyRows.map((row) => db.insert(taskDependencies).values(row)),
        ...assigneeRows.map((row) => db.insert(taskAssignees).values(row)),
    ]

    try {
        await db.batch(queries as [BatchQuery, ...BatchQuery[]])
        return { ok: true, taskIds: tasks.map((item) => item.id) }
    } catch (error) {
        console.error("[tasks] batch insert failed:", error)
        return { ok: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export type CreateTasksResult =
    | { ok: true; taskIds: string[] }
    | {
          ok: false
          error: "FORBIDDEN" | "INVALID_DATA" | "INTERNAL_SERVER_ERROR"
          issues?: string[]
      }

export async function createTasksCore({
    projectId,
    actor,
    items,
}: {
    projectId: string
    actor: CreateTasksActor
    items: TaskBatchItem[]
}): Promise<CreateTasksResult> {
    if (!actor.canManage) {
        return { ok: false, error: "FORBIDDEN" }
    }

    const plan = await planTaskBatch({ projectId, items })
    if (!plan.ok) {
        return { ok: false, error: "INVALID_DATA", issues: plan.issues }
    }

    const result = await writeTaskBatch({ projectId, actor, plan })
    if (!result.ok) {
        return { ok: false, error: result.error }
    }

    return { ok: true, taskIds: result.taskIds }
}
