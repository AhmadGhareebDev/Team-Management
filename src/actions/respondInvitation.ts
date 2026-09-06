"use server"
import { eq, and } from "drizzle-orm"
import { db } from "@/db"
import { workspaceInvitation, workspaceMembers, notification } from "@/db/schemas"
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomUUID } from "crypto";

export async function respondInvitation({ invitationId, action }: { invitationId: string, action: "accepted" | "declined" }) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false, error: "UNAUTHENTICATED" }
    }

    const invitation = await db.query.workspaceInvitation.findFirst({
        where: and(
            eq(workspaceInvitation.id, invitationId),
            eq(workspaceInvitation.inviteeId, session.user.id)
        )
    })

    if (!invitation) {
        return { success: false, error: "NOT_FOUND" }
    }

    if (invitation.status !== "pending") {
        return { success: false, error: "ALREADY_HANDLED" }
    }

    try {
        if (action === "accepted") {
            await db.batch([
                db.insert(workspaceMembers).values({
                    id: randomUUID(),
                    workspaceId: invitation.workspaceId,
                    userId: session.user.id,
                    role: "member",
                }),
                db.update(workspaceInvitation).set({
                    status: "accepted",
                    updatedAt: new Date(),
                }).where(eq(workspaceInvitation.id, invitationId)),
            ])
        } else {
            await db.update(workspaceInvitation).set({
                status: "declined",
                updatedAt: new Date(),
            }).where(eq(workspaceInvitation.id, invitationId))
        }

        await db.update(notification).set({
            isRead: true,
        }).where(eq(notification.workspaceInvitationId, invitationId))

        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }
}