import { db } from "@/db";
import { task, taskAssignees, project } from "@/db/schemas";
import { and, asc, desc, eq, exists, gt, inArray, isNotNull, isNull, lt, lte, ne, sql } from "drizzle-orm";
import { PAGE_SIZES, type Paginated } from "@/lib/pagination";
import type { TaskStatus } from "@/db/validations";

export type TaskPriority = (typeof task.priority.enumValues)[number];

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

export type TaskSort = "due_asc" | "newest" | "priority";
export type TaskDueFilter = "overdue" | "due_soon" | "none";

export type UserTaskFilters = {
    status?: TaskStatus;
    priority?: TaskPriority;
    due?: "overdue" | "due_soon" | "none";
    workspaceId?: string;
    projectId?: string;
};

function priorityOrder() {
    return sql`case ${task.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;
}

function taskSortOrder(sort: TaskSort | undefined) {
    if (sort === "newest") {
        return [desc(task.createdAt)];
    }
    if (sort === "priority") {
        return [priorityOrder(), asc(task.dueDate), desc(task.createdAt)];
    }
    return [asc(task.dueDate), desc(task.createdAt)];
}

export async function getUserAssignedTasks(
    userId: string,
    options: {
        page?: number;
        pageSize?: number;
        filters?: {
            status?: TaskStatus;
            priority?: TaskPriority;
            due?: "overdue" | "due_soon" | "none";
            workspaceId?: string;
            projectId?: string;
        };
        sort?: "due_asc" | "newest" | "priority";
    } = {}
): Promise<Paginated<UserAssignedTaskItem>> {
    const pageSize = options.pageSize ?? PAGE_SIZES.tasks;
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * pageSize;
    const filters = options.filters ?? {};

    const now = new Date();
    const dueSoonBefore = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const conditions = [
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
        ),
    ];

    if (filters.status) {
        conditions.push(eq(task.status, filters.status));
    }
    if (filters.priority) {
        conditions.push(eq(task.priority, filters.priority));
    }
    if (filters.projectId) {
        conditions.push(eq(task.projectId, filters.projectId));
    }
    if (filters.workspaceId) {
        conditions.push(
            exists(
                db
                    .select({ projectId: project.id })
                    .from(project)
                    .where(
                        and(
                            eq(project.id, task.projectId),
                            eq(project.workspaceId, filters.workspaceId)
                        )
                    )
            )
        );
    }
    if (filters.due === "overdue") {
        conditions.push(isNotNull(task.dueDate), lt(task.dueDate, now), ne(task.status, "done"));
    } else if (filters.due === "due_soon") {
        conditions.push(
            isNotNull(task.dueDate),
            gt(task.dueDate, now),
            lte(task.dueDate, dueSoonBefore),
            ne(task.status, "done")
        );
    } else if (filters.due === "none") {
        conditions.push(isNull(task.dueDate));
    }

    const where = and(...conditions);

    const [items, countRows] = await Promise.all([
        db.query.task.findMany({
            where,
            orderBy: taskSortOrder(options.sort),
            limit: pageSize,
            offset,
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
        }),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(task)
            .where(where),
    ]);

    return { items: items as unknown as UserAssignedTaskItem[], total: countRows[0]?.count ?? 0 };
}
export type UserAssignedTaskItem = Awaited<
    ReturnType<typeof db.query.task.findMany>
>[number] & {
    project: {
        id: string;
        name: string;
        workspaceId: string;
        workspace: { id: string; name: string };
    };
    assignees: { user: { id: string; name: string; username: string | null; avatar_url: string | null } }[];
    blockedBy: { id: string; dependsOn: { id: string; title: string; status: TaskStatus } }[];
    subtasks: { id: string; isDone: boolean }[];
};
export type UserAssignedTask = UserAssignedTaskItem;

export async function getProjectDashboardTasks(
    projectId: string,
    perStatus = 8
) {
    const columnPriorityOrder = sql`case ${task.priority} when 'urgent' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`;

    const ranked = db.$with("ranked_project_tasks").as(
        db
            .select({
                id: task.id,
                rn: sql<number>`row_number() over (partition by ${task.status} order by ${columnPriorityOrder}, ${task.dueDate} asc nulls last)`.as("rn"),
            })
            .from(task)
            .where(eq(task.projectId, projectId))
    );

    const rankedIds = await db
        .with(ranked)
        .select({ id: ranked.id })
        .from(ranked)
        .where(lte(ranked.rn, perStatus));

    if (rankedIds.length === 0) {
        return [];
    }

    return await db.query.task.findMany({
        where: inArray(task.id, rankedIds.map((row) => row.id)),
        orderBy: [columnPriorityOrder, asc(task.dueDate)],
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
export type ProjectDashboardTask = Awaited<
    ReturnType<typeof getProjectDashboardTasks>
>[number];
