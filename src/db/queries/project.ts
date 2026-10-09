import { db } from "@/db";
import { project, task } from "@/db/schemas";
import { workspaceMembers } from "@/db/schemas/workspaceMembers";
import { projectMembers } from "@/db/schemas/projectMembers";
import { and, asc, desc, eq, exists, lt, ne, notExists, sql } from "drizzle-orm";
import { PAGE_SIZES, type Paginated } from "@/lib/pagination";

export type ProjectSort = "newest" | "nearest_deadline" | "name";
export type ProjectHealthFilter = "at_risk" | "healthy";

export type ProjectFilters = {
    health?: ProjectHealthFilter;
    workspaceId?: string;
};

export function projectHealthCondition(health?: ProjectHealthFilter) {
    if (!health) {
        return undefined;
    }

    const overdueTask = db
        .select({ id: task.id })
        .from(task)
        .where(
            and(
                eq(task.projectId, project.id),
                lt(task.dueDate, new Date()),
                ne(task.status, "done")
            )
        );

    return health === "at_risk" ? exists(overdueTask) : notExists(overdueTask);
}

export function projectOrderBy(sort?: ProjectSort) {
    if (sort === "name") {
        return [asc(project.name)];
    }
    if (sort === "nearest_deadline") {
        // The correlated subquery needs its own alias, so the columns are
        // spelled out instead of interpolated (interpolation would qualify
        // them with the outer `project` table).
        return [
            sql`(select min(t.due_date) from task t where t.project_id = ${project.id} and t.status <> 'done') asc nulls last`,
            desc(project.createdAt),
        ];
    }
    return [desc(project.createdAt)];
}

export async function getProjectById(projectId: string) {
    return await db.query.project.findFirst({
        where: eq(project.id, projectId),
        columns: {
            id: true,
            workspaceId: true,
            name: true,
            description: true,
        },
        with: {
            members: {
                columns: {},
                with: {
                    user: {
                        columns: {
                            id: true,
                            name: true,
                            username: true,
                            avatar_url: true,
                        },
                    },
                },
            },
        },
    });
}
export type ProjectWithMembers = Awaited<ReturnType<typeof getProjectById>> & {
    workspaceId: string;
};

export async function getUserProjectAccess(projectId: string, userId: string) {
    const projectRow = await db.query.project.findFirst({
        where: eq(project.id, projectId),
        columns: { id: true, workspaceId: true },
    });

    if (!projectRow) return null;

    const workspaceMembership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, projectRow.workspaceId),
            eq(workspaceMembers.userId, userId)
        ),
        columns: { role: true },
    });

    const projectMembership = await db.query.projectMembers.findFirst({
        where: and(
            eq(projectMembers.projectId, projectId),
            eq(projectMembers.userId, userId)
        ),
        columns: { id: true },
    });

    return {
        workspaceId: projectRow.workspaceId,
        role: workspaceMembership?.role ?? null,
        isProjectMember: Boolean(projectMembership),
    };
}
export type UserProjectAccess = Awaited<ReturnType<typeof getUserProjectAccess>>;

export async function getUserProjects(
    userId: string,
    options: {
        page?: number;
        pageSize?: number;
        filters?: ProjectFilters;
        sort?: ProjectSort;
    } = {}
): Promise<Paginated<UserProject>> {
    const pageSize = options.pageSize ?? PAGE_SIZES.projects;
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * pageSize;
    const filters = options.filters ?? {};

    const memberAccess = exists(
        db
            .select({ projectId: projectMembers.projectId })
            .from(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, project.id),
                    eq(projectMembers.userId, userId)
                )
            )
    );

    const health = projectHealthCondition(filters.health);
    const workspace = filters.workspaceId
        ? eq(project.workspaceId, filters.workspaceId)
        : undefined;

    const where = and(memberAccess, health, workspace);

    const [items, countRows] = await Promise.all([
        db.query.project.findMany({
            where,
            orderBy: projectOrderBy(options.sort),
            limit: pageSize,
            offset,
            columns: {
                id: true,
                name: true,
                description: true,
                workspaceId: true,
            },
            with: {
                members: {
                    columns: {},
                    with: {
                        user: {
                            columns: {
                                id: true,
                                name: true,
                                avatar_url: true,
                            },
                        },
                    },
                },
            },
        }),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(project)
            .where(where),
    ]);

    return { items: items as unknown as UserProjectItem[], total: countRows[0]?.count ?? 0 };
}
export type UserProjectItem = Awaited<
    ReturnType<typeof db.query.project.findMany>
>[number] & {
    members: {
        user: {
            id: string;
            name: string;
            avatar_url: string | null;
        };
    }[];
};
export type UserProject = UserProjectItem;
