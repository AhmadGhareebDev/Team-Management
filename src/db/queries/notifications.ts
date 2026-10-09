import { db } from "@/db";
import { notification } from "@/db/schemas";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

type NotificationTypeName = (typeof notification.$inferSelect)["type"];

export type NotificationTab = "invitations" | "tasks" | "members";

export const NOTIFICATION_TAB_TYPES: Record<
    NotificationTab,
    readonly NotificationTypeName[]
> = {
    invitations: ["workspace_invitation"],
    tasks: [
        "task_assigned",
        "task_unblocked",
        "dependency_overdue",
        "dependency_resolved",
        "deadline_approaching",
        "task_reassigned",
        "task_overdue",
    ],
    members: ["member_removed", "project_member_added"],
};

function tabCondition(tab: NotificationTab) {
    return inArray(notification.type, NOTIFICATION_TAB_TYPES[tab]);
}

export async function getUserNotifications(
    userId: string,
    options: {
        tab?: NotificationTab;
        limit?: number;
        offset?: number;
    } = {}
) {
    const tab = options.tab ?? "tasks";
    const limit = options.limit ?? 20;
    const offset = options.offset ?? 0;

    const where = and(eq(notification.userId, userId), tabCondition(tab));

    const [items, countRows] = await Promise.all([
        db.query.notification.findMany({
            where,
            orderBy: [desc(notification.createdAt)],
            limit,
            offset,
            with: {
                actor: {
                    columns: {
                        id: true,
                        name: true,
                        avatar_url: true,
                    },
                },
                workspace: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
                project: {
                    columns: {
                        id: true,
                        workspaceId: true,
                    },
                },
                workspaceInvitation: {
                    columns: {
                        id: true,
                        status: true,
                    },
                },
            },
        }),
        db
            .select({ count: sql<number>`count(*)::int` })
            .from(notification)
            .where(where),
    ]);

    return { items, total: countRows[0]?.count ?? 0 };
}

export type Notification = Awaited<ReturnType<typeof getUserNotifications>>["items"][number];

export type NotificationCounts = Record<NotificationTab, number>;

export type NotificationTabCounts = {
    total: NotificationCounts;
    unread: NotificationCounts;
};

export async function getUserNotificationCounts(
    userId: string
): Promise<NotificationTabCounts> {
    const rows = await db
        .select({
            type: notification.type,
            isRead: notification.isRead,
            count: sql<number>`count(*)::int`,
        })
        .from(notification)
        .where(eq(notification.userId, userId))
        .groupBy(notification.type, notification.isRead);

    const total: NotificationCounts = { invitations: 0, tasks: 0, members: 0 };
    const unread: NotificationCounts = { invitations: 0, tasks: 0, members: 0 };

    for (const row of rows) {
        for (const tab of Object.keys(total) as NotificationTab[]) {
            if (NOTIFICATION_TAB_TYPES[tab].includes(row.type)) {
                total[tab] += row.count;
                if (!row.isRead) unread[tab] += row.count;
            }
        }
    }

    return { total, unread };
}