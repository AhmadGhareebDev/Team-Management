"use server"
import { db } from "@/db"
import { eq, ilike, and, notInArray } from "drizzle-orm"
import { user, workspaceMembers, workspaceInvitation } from "@/db/schemas"
import { createEmailVerifyToken } from "@/lib/email-verify-token"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

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
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { success: false as const, error: "UNAUTHENTICATED" }
  }

  // Without this the action enumerates users by name and username for any
  // workspace id the caller supplies, including workspaces they cannot see.
  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
    columns: { role: true },
  })

  if (!membership) {
    return { success: false as const, error: "UNAUTHORIZED" }
  }

  if (membership.role !== "owner" && membership.role !== "admin") {
    return { success: false as const, error: "FORBIDDEN" }
  }

  const memberIds = db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))

  const users = await db.query.user.findMany({
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

  return { success: true as const, users }
}
export type SearchedUser = Extract<
  Awaited<ReturnType<typeof searchUsersByUsername>>,
  { success: true }
>["users"][number]