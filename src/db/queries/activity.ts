import { db } from "@/db";
import { activity, workspaceMembers } from "@/db/schemas";
import { desc, eq, inArray } from "drizzle-orm";

export async function getRecentActivityForUser(userId: string, limit = 20) {
    if (!userId) {
        return [];
    }

    const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, userId),
        columns: { workspaceId: true },
    });

    const workspaceIds = [...new Set(memberships.map((m) => m.workspaceId))];
    if (workspaceIds.length === 0) {
        return [];
    }

    return await db.query.activity.findMany({
        where: inArray(activity.workspaceId, workspaceIds),
        orderBy: desc(activity.createdAt),
        limit,
        with: {
            actor: { columns: { id: true, name: true, avatar_url: true } },
            project: { columns: { id: true, name: true } },
            workspace: { columns: { id: true, name: true } },
        },
    });
}

export type RecentActivity = Awaited<ReturnType<typeof getRecentActivityForUser>>[number];
