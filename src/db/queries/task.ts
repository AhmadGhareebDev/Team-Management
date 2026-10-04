import { db } from "@/db";
import { task, taskAssignees } from "@/db/schemas";
import { and, desc, eq, exists, inArray } from "drizzle-orm";

export async function getProjectTasks(projectId: string) {
    return await db.query.task.findMany({
        where: eq(task.projectId, projectId),
        columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            positionX: true,
            positionY: true,
        },
        with: {
            assignees: {
                columns: {},
                with: {
                    user: {
                        columns: { id: true, name: true, username: true, avatar_url: true },
                    },
                },
            },
            blockedBy: {
                columns: { id: true },
                with: {
                    dependsOn: {
                        columns: { id: true, title: true, status: true, dueDate: true },
                    },
                },
            },
            subtasks: {
                columns: { id: true, title: true, isDone: true, createdAt: true },
                with: {
                    createdBy: { columns: { id: true } },
                },
            },
        },
    });
}
export type ProjectTask = Awaited<ReturnType<typeof getProjectTasks>>[number];

/**
 * Tasks a specific user is assigned to within specific projects.
 * One query, expressed directly on `task` with an EXISTS subquery so the
 * assignment does not have to be loaded and filtered in JS.
 */
export async function getTasksAssignedToUserInProjects({
    projectIds,
    userId,
}: {
    projectIds: string[];
    userId: string;
}) {
    if (projectIds.length === 0) {
        return [];
    }

    return await db.query.task.findMany({
        where: and(
            inArray(task.projectId, projectIds),
            exists(
                db
                    .select({ taskId: taskAssignees.taskId })
                    .from(taskAssignees)
                    .where(
                        and(
                            eq(taskAssignees.taskId, task.id),
                            eq(taskAssignees.userId, userId)
                        )
                    )
            )
        ),
        columns: { id: true, title: true },
    });
}

/** Tasks a specific user is assigned to within one specific project. */
export async function getTasksAssignedToUserInProject({
    projectId,
    userId,
}: {
    projectId: string;
    userId: string;
}) {
    return await getTasksAssignedToUserInProjects({ projectIds: [projectId], userId });
}

export type AssignedTask = Awaited<
    ReturnType<typeof getTasksAssignedToUserInProjects>
>[number];
export async function getUserAssignedTasks(userId: string) {
    return await db.query.task.findMany({
        where: exists(
            db
                .select({ taskId: taskAssignees.taskId })
                .from(taskAssignees)
                .where(
                    and(
                        eq(taskAssignees.taskId, task.id),
                        eq(taskAssignees.userId, userId)
                    )
                )
        ),
        orderBy: [desc(task.createdAt)],
        columns: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            createdAt: true,
        },
        with: {
            project: {
                columns: {
                    id: true,
                    name: true,
                    workspaceId: true,
                },
                with: {
                    workspace: {
                        columns: {
                            id: true,
                            name: true,
                        }
                    }
                }
            },
            assignees: {
                columns: {},
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            username: true,
                            avatar_url: true,
                        }
                    }
                }
            },
            blockedBy: {
                columns: { id: true },
                with: {
                    dependsOn: {
                        columns: { id: true, title: true, status: true },
                    }
                }
            },
            subtasks: {
                columns: { id: true, isDone: true },
            }
        },
    });
}
export type UserAssignedTask = Awaited<ReturnType<typeof getUserAssignedTasks>>[number];
