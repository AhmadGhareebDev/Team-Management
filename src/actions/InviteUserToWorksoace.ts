"use server"
import { eq , and } from "drizzle-orm"
import { db } from "@/db"
import {  workspaceMembers , workspaceInvitation, notification  } from "@/db/schemas"
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { randomUUID } from "crypto";




export async function inviteUserToWorkspace({workspaceId , inviteeId} : {workspaceId: string , inviteeId: string} ) {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false , error: "UNAUTHENTICATED" }
    }

    const membership = await db.query.workspaceMembers.findFirst({
        where: and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, session.user.id)
        )
    })

    if (!membership) {
        return { success: false, error: "UNAUTHORIZED" }
    }

    const canEdit = membership.role === "owner" || membership.role === "admin";
    if (!canEdit) {
        return { success: false, error: "FORBIDDEN" }
    }
    const existingMember = await db.query.workspaceMembers.findFirst({
    where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, inviteeId)
    )
    })

    if (existingMember) {
        return { success: false, error: "ALREADY_MEMBER" }
    }
    const existingInvitation = await db.query.workspaceInvitation.findFirst({
    where: and(
        eq(workspaceInvitation.workspaceId, workspaceId),
        eq(workspaceInvitation.inviteeId, inviteeId)
    )
    })

    if (existingInvitation && existingInvitation.status === "pending") {
        return { success: false, error: "ALREADY_INVITED" }
    }

    try {
        let invitationId: string;

        if (existingInvitation && existingInvitation.status === "declined") {
            invitationId = existingInvitation.id;
            await db.update(workspaceInvitation).set({
                status: "pending",
                inviterId: session.user.id,
                updatedAt: new Date(),
            }).where(
                and(
                    eq(workspaceInvitation.workspaceId, workspaceId),
                    eq(workspaceInvitation.inviteeId, inviteeId)
                )
            )
        } else {
            invitationId = randomUUID();
            await db.insert(workspaceInvitation).values({
                id: invitationId,
                workspaceId,
                inviterId: session.user.id,
                inviteeId,
                status: "pending",
            })
        }

        await db.insert(notification).values({
            id: randomUUID(),
            userId: inviteeId,
            actorId: session.user.id,
            workspaceId,
            workspaceInvitationId: invitationId,
            type: "workspace_invitation",
            body: `You have been invited to join a workspace.`,
        })
        return { success: true }

    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }

    }


}