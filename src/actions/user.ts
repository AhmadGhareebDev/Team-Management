"use server"
import { db } from "@/db"
import { eq, ilike, and, notInArray } from "drizzle-orm"
import { user, workspaceMembers, workspaceInvitation } from "@/db/schemas"
import { createEmailVerifyToken } from "@/lib/email-verify-token"

export async function checkEmail(email: string) {
    try {
    const existing = await db.query.user.findFirst({
        where: eq(user.email, email)
    })

    return { success: true ,available: !existing };

    } catch {
        return { success: false , message: "Something went wrong. Please try again later."}
    }

}

export async function checkUsername(username: string) {
    try {
    const existing = await db.query.user.findFirst({
        where: eq(user.username, username)
    })

    return { success: true ,available: !existing };

    } catch  {
        return { success: false , message: "Something went wrong. Please try again later."}
    }

}

export async function createEmailVerifyTokenAction(email: string): Promise<string> {
    return await createEmailVerifyToken(email)
}

export async function searchUsersByUsername(username: string, workspaceId: string) {
  const memberIds = db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))

  return await db.query.user.findMany({
    where: and(
      ilike(user.username, `%${username}%`),
      notInArray(user.id, memberIds),
    ),
    columns: { id: true, name: true, username: true, avatar_url: true },
    with: {
      workspaceInvitationsReceived: {
        where: eq(workspaceInvitation.workspaceId, workspaceId),
        columns: { status: true },
      },
    },
    limit: 10,
  })
}
export type SearchedUser = Awaited<ReturnType<typeof searchUsersByUsername>>[number]