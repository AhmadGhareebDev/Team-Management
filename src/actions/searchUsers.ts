"use server"
import { ilike, eq, and, notInArray } from "drizzle-orm"
import { db } from "@/db"
import { user, workspaceMembers, workspaceInvitation } from "@/db/schemas"

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