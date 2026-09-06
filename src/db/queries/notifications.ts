import { db } from "@/db";
import { notification } from "@/db/schemas";
import { eq, desc } from "drizzle-orm";

export async function getUserNotifications(userId: string) {
    return await db.query.notification.findMany({
        where: eq(notification.userId, userId),
        orderBy: desc(notification.createdAt),
        limit: 30,
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
        },
    })
}
export type Notification = Awaited<ReturnType<typeof getUserNotifications>>[number];