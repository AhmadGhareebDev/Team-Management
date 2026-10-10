import { db } from "@/db";
import { workspaceMembers } from "@/db/schemas/workspaceMembers";
import { project } from "@/db/schemas/project";
import { task } from "@/db/schemas/task";
import { taskAssignees } from "@/db/schemas/taskAssignees";
import { user } from "@/db/schemas/auth-schema";
import { eq, and, inArray, asc, desc, ne, lte, ilike, or, sql, type SQL } from "drizzle-orm";
import { workspace } from "@/db/schemas"
import type { TaskStatus } from "@/db/validations"
import { PAGE_SIZES, type Paginated } from "@/lib/pagination";
import {
    projectHealthCondition,
    projectOrderBy,
    type ProjectFilters,
    type ProjectSort,
} from "@/db/queries/project";






export async function getUserWorkSpaces(userId: string) {
    return await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        with: {
            workspace: {
                columns: {
                    id: true,
                    name: true,
                }
            }
        }
    })
}
export type WorkspaceWithRole = Awaited<ReturnType<typeof getUserWorkSpaces>>[number];

export async function getUserWorkSpacesPage(
    userId: string,
    options: {
        page?: number;
        pageSize?: number;
        sort?: "name" | "newest";
    } = {}
): Promise<Paginated<WorkspaceWithRole>> {
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? PAGE_SIZES.workspaces));
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * pageSize;

    const where = eq(workspaceMembers.userId, userId);

    // Explicit join so the name sort is a plain indexed sort instead of a
    // correlated subquery; `db.query` cannot order by a related table column.
    const orderBy: SQL[] =
        options.sort === "newest"
            ? [desc(workspaceMembers.joinedAt)]
            : [asc(workspace.name)];

    const [items, countRows] = await Promise.all([
        db
            .select({
                id: workspaceMembers.id,
                workspaceId: workspaceMembers.workspaceId,
                userId: workspaceMembers.userId,
                role: workspaceMembers.role,
                joinedAt: workspaceMembers.joinedAt,
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                },
            })
            .from(workspaceMembers)
            .innerJoin(workspace, eq(workspace.id, workspaceMembers.workspaceId))
            .where(where)
            .orderBy(...orderBy)
            .limit(pageSize)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(workspaceMembers)
            .where(where),
    ]);

    return {
        items: items as unknown as WorkspaceWithRole[],
        total: countRows[0]?.count ?? 0,
    };
}

export  async function getWorkspaceById(workspaceId: string) {
    return await db.query.workspace.findFirst({
        where: eq(workspace.id , workspaceId),
        columns: {
            id: true,
            name: true,
        }

    })
}
export type Workspace = Awaited<ReturnType<typeof getWorkspaceById>>;

export async function getUserWorkspaceRole(workspaceId: string, userId: string) {
    const membership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, userId)
        ),
        columns: {
            role: true,
        }
    })

    return membership?.role ?? null
}


export type WorkspaceMemberWithUser = Awaited<
    ReturnType<typeof db.query.workspaceMembers.findMany>
>[number] & {
    user: {
        id: string;
        name: string;
        username: string | null;
        avatar_url: string | null;
    };
};

export async function getWorkspaceMembers(workspaceId: string) {
  return await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.workspaceId, workspaceId),
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
  })
}

export async function getWorkspaceMembersPage(
    workspaceId: string,
    options: {
        page?: number;
        pageSize?: number;
        role?: "owner" | "admin" | "member";
        search?: string;
        sort?: "joined" | "role" | "name";
    } = {}
): Promise<Paginated<WorkspaceMemberWithUser>> {
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? PAGE_SIZES.members));
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * pageSize;

    // Joined explicitly rather than correlated, so the search and the name
    // sort can use the indexes on user.name / user.username. `db.query` would
    // have forced a per-row subquery for each.
    const conditions = [eq(workspaceMembers.workspaceId, workspaceId)];

    if (options.role) {
        conditions.push(eq(workspaceMembers.role, options.role));
    }

    if (options.search) {
        const pattern = `%${options.search.toLowerCase()}%`;
        const nameMatch = or(
            ilike(user.name, pattern),
            ilike(user.username, pattern)
        );
        if (nameMatch) {
            conditions.push(nameMatch);
        }
    }

    const where = and(...conditions);

    let orderBy: SQL[] = [asc(workspaceMembers.joinedAt)];
    if (options.sort === "role") {
        orderBy = [
            sql`case ${workspaceMembers.role} when 'owner' then 0 when 'admin' then 1 else 2 end`,
            asc(workspaceMembers.joinedAt),
        ];
    } else if (options.sort === "name") {
        orderBy = [asc(user.name), asc(workspaceMembers.joinedAt)];
    }

    const [items, countRows] = await Promise.all([
        db
            .select({
                id: workspaceMembers.id,
                workspaceId: workspaceMembers.workspaceId,
                userId: workspaceMembers.userId,
                role: workspaceMembers.role,
                joinedAt: workspaceMembers.joinedAt,
                user: {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    avatar_url: user.avatar_url,
                },
            })
            .from(workspaceMembers)
            .innerJoin(user, eq(user.id, workspaceMembers.userId))
            .where(where)
            .orderBy(...orderBy)
            .limit(pageSize)
            .offset(offset),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(workspaceMembers)
            .innerJoin(user, eq(user.id, workspaceMembers.userId))
            .where(where),
    ]);

    return {
        items: items as unknown as WorkspaceMemberWithUser[],
        total: countRows[0]?.count ?? 0,
    };
}

export type MemberAssignment = {
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: Date | null;
    projectId: string;
    projectName: string;
};

export type MemberAssignments = {
    items: MemberAssignment[];
    total: number;
};

export async function getWorkspaceMemberAssignments(
    workspaceId: string,
    perMember = 8
): Promise<Map<string, MemberAssignments>> {
    const ranked = db.$with("ranked_member_assignments").as(
        db
            .select({
                userId: taskAssignees.userId,
                // The CTE joins task and project, which both expose `id`, so alias them here
                // to keep the outer select unambiguous.
                taskId: sql<string>`${task.id}`.as("task_id"),
                title: task.title,
                status: task.status,
                dueDate: task.dueDate,
                projectId: sql<string>`${project.id}`.as("project_id"),
                projectName: sql<string>`${project.name}`.as("project_name"),
                rn: sql<number>`row_number() over (partition by ${taskAssignees.userId} order by ${task.dueDate} asc nulls last, ${project.name})`.as("rn"),
            })
            .from(taskAssignees)
            .innerJoin(task, eq(taskAssignees.taskId, task.id))
            .innerJoin(project, eq(task.projectId, project.id))
            .where(and(eq(project.workspaceId, workspaceId), ne(task.status, "done")))
    );

    const [rows, totalRows] = await Promise.all([
        db
            .with(ranked)
            .select({
                userId: ranked.userId,
                id: ranked.taskId,
                title: ranked.title,
                status: ranked.status,
                dueDate: ranked.dueDate,
                // The CTE exposes two `id` columns (task and project), so both
                // need explicit aliases to stay unambiguous in the outer select.
                projectId: sql<string>`${ranked.projectId}`.as("project_id"),
                projectName: sql<string>`${ranked.projectName}`.as("project_name"),
            })
            .from(ranked)
            .where(lte(ranked.rn, perMember)),
        db
            .select({
                userId: taskAssignees.userId,
                count: sql<number>`count(${taskAssignees.taskId})::int`,
            })
            .from(taskAssignees)
            .innerJoin(task, eq(taskAssignees.taskId, task.id))
            .innerJoin(project, eq(task.projectId, project.id))
            .where(and(eq(project.workspaceId, workspaceId), ne(task.status, "done")))
            .groupBy(taskAssignees.userId),
    ]);

    const byUser = new Map<string, MemberAssignments>();
    const totals = new Map<string, number>(
        totalRows.map((row) => [row.userId, row.count])
    );

    for (const [userId, total] of totals) {
        byUser.set(userId, { items: [], total });
    }

    for (const row of rows) {
        const entry = byUser.get(row.userId) ?? { items: [], total: 0 };
        entry.items.push({
            id: row.id,
            title: row.title,
            status: row.status,
            dueDate: row.dueDate,
            projectId: row.projectId,
            projectName: row.projectName,
        });
        byUser.set(row.userId, entry);
    }

    return byUser;
}
export type WorkspaceMemberAssignments = Awaited<
    ReturnType<typeof getWorkspaceMemberAssignments>
>;


export async function getWorkspaceProjectsWithMembers(
    workspaceId: string,
    options: {
        page?: number;
        pageSize?: number;
        filters?: ProjectFilters;
        sort?: ProjectSort;
    } = {}
): Promise<Paginated<WorkspaceProjectWithMembersItem>> {
    const pageSize = Math.min(100, Math.max(1, options.pageSize ?? PAGE_SIZES.workspaceProjects));
    const page = Math.max(1, options.page ?? 1);
    const offset = (page - 1) * pageSize;
    const filters = options.filters ?? {};

    const health = projectHealthCondition(filters.health);
    const where = and(eq(project.workspaceId, workspaceId), health);

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
                            }
                        }
                    }
                }
            }
        }),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(project)
            .where(where),
    ]);

    return {
        items: items as unknown as WorkspaceProjectWithMembersItem[],
        total: countRows[0]?.count ?? 0,
    };
}
export type WorkspaceProjectWithMembersItem = Awaited<
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
export type WorkspaceProjectWithMembers = WorkspaceProjectWithMembersItem;
export async function getWorkspaceMembersForWorkspaces(workspaceIds: string[]) {
    if (workspaceIds.length === 0) {
        return [];
    }

    return await db.query.workspaceMembers.findMany({
        where: inArray(workspaceMembers.workspaceId, workspaceIds),
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
    });
}
export type WorkspaceMembersBatch = Awaited<
    ReturnType<typeof getWorkspaceMembersForWorkspaces>
>[number];
