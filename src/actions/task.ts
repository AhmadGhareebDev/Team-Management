"use server"
import { randomUUID } from "crypto"
import { db } from "@/db"
import { task, taskAssignees, taskDependencies, projectMembers } from "@/db/schemas"
import { eq, and, or, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { getUserProjectAccess } from "@/db/queries/project"
import { insertTaskSchema,
    updateTaskSchema,
    type UpdateTaskSchemaType,
    taskStatusSchema,
    type TaskStatusSchemaType,
    taskPositionSchema,
    type TaskPositionSchemaType,
    taskAssigneesSchema,
    type TaskAssigneesSchemaType,
    taskDependencySchema,
    type TaskDependencySchemaType,
} from "@/db/validations"
import { createNotification, clearTaskDateNotifications } from "@/lib/notifications"

const SPACING = 80

async function syncTaskBlocked(taskId: string) {
    const existing = await db.query.task.findFirst({
        where: eq(task.id, taskId),
        columns: { id: true, status: true },
    })

    if (!existing) {
        return
    }

    const deps = await db.query.taskDependencies.findMany({
        where: eq(taskDependencies.taskId, taskId),
        columns: { id: true },
        with: { dependsOn: { columns: { status: true } } },
    })

    const hasPendingDeps = deps.some((d) => d.dependsOn.status !== "done")

    let nextStatus: "todo" | "blocked" | null = null
    if (hasPendingDeps && existing.status !== "blocked") {
        nextStatus = "blocked"
    } else if (!hasPendingDeps && existing.status === "blocked") {
        nextStatus = "todo"
    }

    if (nextStatus) {
        await db
            .update(task)
            .set({ status: nextStatus })
            .where(eq(task.id, taskId))
    }
}

async function recomputeDependents(dependsOnId: string) {
    const dependents = await db.query.taskDependencies.findMany({
        where: eq(taskDependencies.dependsOnId, dependsOnId),
        columns: { taskId: true },
    })

    for (const dependent of dependents) {
        await syncTaskBlocked(dependent.taskId)
    }
}

async function notifyUnblockedDependents({
    actorId,
    workspaceId,
    projectId,
    reason,
    dependentIds,
}: {
    actorId: string
    workspaceId: string
    projectId: string
    reason: string | null
    dependentIds: string[]
}) {
    if (dependentIds.length === 0) return

    try {
        const dependents = await db.query.task.findMany({
            where: inArray(task.id, dependentIds),
            columns: { id: true, title: true },
        })
        const assigneeRows = await db.query.taskAssignees.findMany({
            where: inArray(taskAssignees.taskId, dependentIds),
            columns: { taskId: true, userId: true },
        })
        const reasonLabel = reason ? ` — ${reason}` : ""

        for (const dependent of dependents) {
            const notifyUserIds = assigneeRows
                .filter((a) => a.taskId === dependent.id)
                .map((a) => a.userId)
                .filter((uid) => uid !== actorId)

            if (notifyUserIds.length === 0) continue

            const body = `Task "${dependent.title}" is no longer blocked${reasonLabel}. You can start now.`

            for (const userId of notifyUserIds) {
                await createNotification({
                    userId,
                    actorId,
                    workspaceId,
                    projectId,
                    taskId: dependent.id,
                    type: "task_unblocked",
                    body,
                })
            }
        }
    } catch (error) {
        console.error("Error notifying unblocked dependents:", error)
    }
}

export async function createTask({
    projectId,
    data,
}: {
    projectId: string
    data: { title: string; description?: string }
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = insertTaskSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canCreate = access.role === "owner" || access.role === "admin"
    if (!canCreate) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findMany({
        where: eq(task.projectId, projectId),
        columns: { id: true },
    })

    try {
        await db.insert(task).values({
            id: randomUUID(),
            projectId,
            createdBy: session.user.id,
            title: parsed.data.title,
            description: parsed.data.description,
            positionX: existing.length * SPACING,
            positionY: existing.length * SPACING,
        })

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function updateTask({
    projectId,
    taskId,
    data,
}: {
    projectId: string
    taskId: string
    data: UpdateTaskSchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = updateTaskSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canEdit = access.role === "owner" || access.role === "admin"
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const { title, description, priority, dueDate } = parsed.data

    try {
        await db
            .update(task)
            .set({
                ...(title !== undefined && { title }),
                ...(description !== undefined && { description }),
                ...(priority !== undefined && { priority }),
                ...(dueDate !== undefined && { dueDate }),
            })
            .where(eq(task.id, taskId))

        if (dueDate !== undefined) {
            await clearTaskDateNotifications(taskId)
        }

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function updateTaskStatus({
    projectId,
    taskId,
    data,
}: {
    projectId: string
    taskId: string
    data: TaskStatusSchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = taskStatusSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canView =
        access.role === "owner" || access.role === "admin" || access.isProjectMember
    if (!canView) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true, title: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const assignment = await db.query.taskAssignees.findFirst({
        where: and(
            eq(taskAssignees.taskId, taskId),
            eq(taskAssignees.userId, session.user.id)
        ),
        columns: { id: true },
    })

    const isManager = access.role === "owner" || access.role === "admin"

    if (!isManager && !assignment) {
        return { success: false, error: "FORBIDDEN" }
    }

    if (parsed.data.status === "done") {
        const deps = await db.query.taskDependencies.findMany({
            where: eq(taskDependencies.taskId, taskId),
            columns: { id: true },
            with: { dependsOn: { columns: { status: true } } },
        })

        const hasPendingDeps = deps.some((d) => d.dependsOn.status !== "done")
        if (hasPendingDeps) {
            return { success: false, error: "BLOCKED_DEPENDENCY" }
        }
    }

    let unblockedDependents: string[] = []

    try {
        if (parsed.data.status === "done") {
            const dependents = await db.query.taskDependencies.findMany({
                where: eq(taskDependencies.dependsOnId, taskId),
                columns: { taskId: true },
                with: { task: { columns: { status: true } } },
            })
            const before = new Map(dependents.map((d) => [d.taskId, d.task.status]))

            await db
                .update(task)
                .set({ status: "done" })
                .where(eq(task.id, taskId))

            await recomputeDependents(taskId)

            const after = await db.query.task.findMany({
                where: inArray(
                    task.id,
                    dependents.map((d) => d.taskId)
                ),
                columns: { id: true, status: true, title: true },
            })

            unblockedDependents = after
                .filter((t) => before.get(t.id) === "blocked" && t.status === "todo")
                .map((t) => t.id)
        } else {
            await db
                .update(task)
                .set({ status: parsed.data.status })
                .where(eq(task.id, taskId))

            await recomputeDependents(taskId)
        }

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    } finally {
        if (unblockedDependents.length > 0) {
            await notifyUnblockedDependents({
                actorId: session.user.id,
                workspaceId: access.workspaceId,
                projectId,
                reason: existing?.title ? `"${existing.title}" is done` : null,
                dependentIds: unblockedDependents,
            })
        }
    }
}

export async function updateTaskPosition({
    projectId,
    taskId,
    position,
}: {
    projectId: string
    taskId: string
    position: TaskPositionSchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = taskPositionSchema.safeParse(position)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canMove = access.role === "owner" || access.role === "admin"
    if (!canMove) {
        return { success: false, error: "FORBIDDEN" }
    }

    const taskBelongsToProject = await db.query.task.findFirst({
        where: and(
            eq(task.id, taskId),
            eq(task.projectId, projectId)
        ),
        columns: { id: true },
    })

    if (!taskBelongsToProject) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    try {
        await db.update(task)
            .set({
                positionX: parsed.data.x,
                positionY: parsed.data.y,
            })
            .where(eq(task.id, taskId))

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function deleteTask({
    projectId,
    taskId,
}: {
    projectId: string
    taskId: string
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canEdit = access.role === "owner" || access.role === "admin"
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    try {
        const dependents = await db.query.taskDependencies.findMany({
            where: eq(taskDependencies.dependsOnId, taskId),
            columns: { taskId: true },
        })
        const dependentIds = dependents.map((d) => d.taskId)

        const statusBefore = new Map<string, string>()
        if (dependentIds.length > 0) {
            const rows = await db.query.task.findMany({
                where: inArray(task.id, dependentIds),
                columns: { id: true, status: true },
            })
            for (const row of rows) {
                statusBefore.set(row.id, row.status)
            }
        }

        await db
            .delete(taskDependencies)
            .where(
                or(
                    eq(taskDependencies.taskId, taskId),
                    eq(taskDependencies.dependsOnId, taskId)
                )
            )
        await db.delete(task).where(eq(task.id, taskId))

        const unblockedDependentIds: string[] = []
        for (const dependentId of dependentIds) {
            await syncTaskBlocked(dependentId)
        }

        if (dependentIds.length > 0) {
            const rows = await db.query.task.findMany({
                where: inArray(task.id, dependentIds),
                columns: { id: true, status: true },
            })
            for (const row of rows) {
                if (statusBefore.get(row.id) === "blocked" && row.status === "todo") {
                    unblockedDependentIds.push(row.id)
                }
            }
        }

        await notifyUnblockedDependents({
            actorId: session.user.id,
            workspaceId: access.workspaceId,
            projectId,
            reason: null,
            dependentIds: unblockedDependentIds,
        })

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}
export async function setTaskAssignees({
    projectId,
    taskId,
    data,
}: {
    projectId: string
    taskId: string
    data: TaskAssigneesSchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = taskAssigneesSchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canEdit = access.role === "owner" || access.role === "admin"
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const existing = await db.query.task.findFirst({
        where: and(eq(task.id, taskId), eq(task.projectId, projectId)),
        columns: { id: true, title: true },
    })

    if (!existing) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const { userIds } = parsed.data

    const members = await db.query.projectMembers.findMany({
        where: eq(projectMembers.projectId, projectId),
        columns: { userId: true },
    })
    const memberIds = new Set(members.map((m) => m.userId))

    const allAssigneesAreMembers = userIds.every((id) => memberIds.has(id))
    if (!allAssigneesAreMembers) {
        return { success: false, error: "INVALID_ASSIGNEE" }
    }

    try {
        const currentAssignees = await db.query.taskAssignees.findMany({
            where: eq(taskAssignees.taskId, taskId),
            columns: { userId: true },
        })
        const currentIds = new Set(currentAssignees.map((a) => a.userId))

        await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId))

        if (userIds.length > 0) {
            await db.insert(taskAssignees).values(
                userIds.map((userId) => ({
                    id: randomUUID(),
                    taskId,
                    userId,
                }))
            )
        }

        const added = userIds.filter((id) => !currentIds.has(id))
        const removed = [...currentIds].filter((id) => !userIds.includes(id))

        if (added.length > 0 || removed.length > 0) {
            for (const userId of added) {
                if (userId === session.user.id) continue
                try {
                    await createNotification({
                        userId,
                        actorId: session.user.id,
                        workspaceId: access.workspaceId,
                        projectId,
                        taskId,
                        type: "task_assigned",
                        body: `You've been assigned to task "${existing!.title}".`,
                    })
                } catch (error) {
                    console.error("Error notifying new assignee:", error)
                }
            }

            for (const userId of removed) {
                if (userId === session.user.id) continue
                try {
                    await createNotification({
                        userId,
                        actorId: session.user.id,
                        workspaceId: access.workspaceId,
                        projectId,
                        taskId,
                        type: "task_reassigned",
                        body: `Task "${existing!.title}" was reassigned away from you.`,
                    })
                } catch (error) {
                    console.error("Error notifying removed assignee:", error)
                }
            }
        }

        return { success: true }
    } catch (error) {
        console.error("Error setting task assignees:", error)
        return { success: false, error: "INTERNAL_SERVER_ERROR"  }
    }
}

export async function addTaskDependency({
    projectId,
    data,
}: {
    projectId: string
    data: TaskDependencySchemaType
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const parsed = taskDependencySchema.safeParse(data)
    if (!parsed.success) {
        return { success: false, error: "INVALID_DATA" }
    }

    const { taskId, dependsOnId } = parsed.data

    if (taskId === dependsOnId) {
        return { success: false, error: "SELF_DEPENDENCY" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canEdit = access.role === "owner" || access.role === "admin"
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const projectTaskIds = await db.query.task.findMany({
        where: eq(task.projectId, projectId),
        columns: { id: true },
    })

    const ids = projectTaskIds.map((t) => t.id)

    const bothTasksInProject = ids.includes(taskId) && ids.includes(dependsOnId)
    if (!bothTasksInProject) {
        return { success: false, error: "TASK_NOT_FOUND" }
    }

    const existingDependency = await db.query.taskDependencies.findFirst({
        where: and(
            eq(taskDependencies.taskId, taskId),
            eq(taskDependencies.dependsOnId, dependsOnId)
        ),
        columns: { id: true },
    })

    if (existingDependency) {
        return { success: false, error: "ALREADY_DEPENDENT" }
    }

    const projectDependencies = await db.query.taskDependencies.findMany({
        where: or(
            inArray(taskDependencies.taskId, ids),
            inArray(taskDependencies.dependsOnId, ids)
        ),
        columns: {
            taskId: true,
            dependsOnId: true,
        },
    })

    const dependsOnMap = new Map<string, string[]>()
    for (const dep of projectDependencies) {
        const list = dependsOnMap.get(dep.taskId) ?? []
        list.push(dep.dependsOnId)
        dependsOnMap.set(dep.taskId, list)
    }

    const createsCycle = (start: string, blocked: string): boolean => {
        const queue = [start]
        const visited = new Set<string>()

        while (queue.length > 0) {
            const current = queue.shift()!
            if (current === blocked) return true
            if (visited.has(current)) continue
            visited.add(current)

            for (const next of dependsOnMap.get(current) ?? []) {
                queue.push(next)
            }
        }

        return false
    }

    if (createsCycle(dependsOnId, taskId)) {
        return { success: false, error: "CYCLIC_DEPENDENCY" }
    }

    try {
        await db.insert(taskDependencies).values({
            id: randomUUID(),
            taskId,
            dependsOnId,
        })

        await syncTaskBlocked(taskId)

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}

export async function removeTaskDependency({
    projectId,
    dependencyId,
}: {
    projectId: string
    dependencyId: string
}) {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const access = await getUserProjectAccess(projectId, session.user.id)
    if (!access) {
        return { success: false, error: "PROJECT_NOT_FOUND" }
    }

    const canEdit = access.role === "owner" || access.role === "admin"
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }

    const depRow = await db.query.taskDependencies.findFirst({
        where: eq(taskDependencies.id, dependencyId),
        columns: { id: true, taskId: true, dependsOnId: true },
    })

    if (!depRow) {
        return { success: false, error: "DEPENDENCY_NOT_FOUND" }
    }

    const taskBelongsToProject = await db.query.task.findFirst({
        where: and(
            eq(task.id, depRow.taskId),
            eq(task.projectId, projectId)
        ),
        columns: { id: true },
    })

    if (!taskBelongsToProject) {
        return { success: false, error: "DEPENDENCY_NOT_FOUND" }
    }

    try {
        const statusBefore = await db.query.task.findFirst({
            where: eq(task.id, depRow.taskId),
            columns: { status: true },
        })

        await db.delete(taskDependencies)
            .where(eq(taskDependencies.id, dependencyId))

        await syncTaskBlocked(depRow.taskId)

        const statusAfter = await db.query.task.findFirst({
            where: eq(task.id, depRow.taskId),
            columns: { status: true },
        })

        if (statusBefore?.status === "blocked" && statusAfter?.status === "todo") {
            const blocker = await db.query.task.findFirst({
                where: eq(task.id, depRow.dependsOnId),
                columns: { title: true },
            })

            await notifyUnblockedDependents({
                actorId: session.user.id,
                workspaceId: access.workspaceId,
                projectId,
                reason: blocker?.title
                    ? `the dependency "${blocker.title}" was removed`
                    : null,
                dependentIds: [depRow.taskId],
            })
        }

        return { success: true }
    } catch {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}