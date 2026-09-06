"use server"
import { db } from "@/db"
import { workspaceMembers, projectMembers, project } from "@/db/schemas"
import { eq, and, inArray } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

type Result = { success: boolean; error?: string }

async function requireManager(workspaceId: string): Promise<
  | { success: true; data: { actorId: string; actorRole: "owner" | "admin" | "member" } }
  | { success: false; error: string }
> {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return { success: false, error: "UNAUTHENTICATED" }
  }

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user.id)
    ),
  })

  if (!membership) {
    return { success: false, error: "UNAUTHORIZED" }
  }

  const canManage = membership.role === "owner" || membership.role === "admin"
  if (!canManage) {
    return { success: false, error: "FORBIDDEN" }
  }

  return {
    success: true,
    data: { actorId: session.user.id, actorRole: membership.role },
  }
}

async function requireTarget(
  workspaceId: string,
  memberId: string
): Promise<
  | { success: true; data: "owner" | "admin" | "member" }
  | { success: false; error: string }
> {
  if (!memberId) {
    return { success: false, error: "INVALID_DATA" }
  }

  const target = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, memberId)
    ),
    columns: { role: true },
  })

  if (!target) {
    return { success: false, error: "TARGET_NOT_FOUND" }
  }

  return { success: true, data: target.role }
}

export async function makeMemberAdmin(workspaceId: string, memberId: string): Promise<Result> {
  const actor = await requireManager(workspaceId)
  if (!actor.success) {
    return { success: false, error: actor.error }
  }

  try {
    const target = await requireTarget(workspaceId, memberId)
    if (!target.success) {
      return { success: false, error: target.error }
    }

    if (target.data !== "member") {
      return { success: false, error: "INVALID_TRANSITION" }
    }

    await db.update(workspaceMembers)
      .set({ role: "admin" })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, memberId)
      ))

    return { success: true }
  } catch (error) {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}

export async function makeMemberRegular(workspaceId: string, memberId: string): Promise<Result> {
  const actor = await requireManager(workspaceId)
  if (!actor.success) {
    return { success: false, error: actor.error }
  }

  if (actor.data.actorRole !== "owner") {
    return { success: false, error: "FORBIDDEN" }
  }

  try {
    const target = await requireTarget(workspaceId, memberId)
    if (!target.success) {
      return { success: false, error: target.error }
    }

    if (target.data !== "admin") {
      return { success: false, error: "INVALID_TRANSITION" }
    }

    await db.update(workspaceMembers)
      .set({ role: "member" })
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, memberId)
      ))

    return { success: true }
  } catch (error) {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}

export async function makeMemberOwner(workspaceId: string, memberId: string): Promise<Result> {
  const actor = await requireManager(workspaceId)
  if (!actor.success) {
    return { success: false, error: actor.error }
  }

  if (actor.data.actorRole !== "owner") {
    return { success: false, error: "FORBIDDEN" }
  }

  try {
    if (memberId === actor.data.actorId) {
      return { success: false, error: "INVALID_TRANSITION" }
    }

    const target = await requireTarget(workspaceId, memberId)
    if (!target.success) {
      return { success: false, error: target.error }
    }

    await db.batch([
      db.update(workspaceMembers)
        .set({ role: "owner" })
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberId)
        )),
      db.update(workspaceMembers)
        .set({ role: "admin" })
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, actor.data.actorId)
        )),
    ])

    return { success: true }
  } catch (error) {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}

export async function removeWorkspaceMember(workspaceId: string, memberId: string): Promise<Result> {
  const actor = await requireManager(workspaceId)
  if (!actor.success) {
    return { success: false, error: actor.error }
  }

  try {
    if (memberId === actor.data.actorId || !memberId) {
      return { success: false, error: "INVALID_TRANSITION" }
    }

    const target = await requireTarget(workspaceId, memberId)
    if (!target.success) {
      return { success: false, error: target.error }
    }

    if (target.data === "owner") {
      return { success: false, error: "INVALID_TRANSITION" }
    }

    if (actor.data.actorRole !== "owner" && target.data !== "member") {
      return { success: false, error: "FORBIDDEN" }
    }

    const workspaceProjectIds = db
      .select({ id: project.id })
      .from(project)
      .where(eq(project.workspaceId, workspaceId))

    await db.batch([
      db.delete(workspaceMembers)
        .where(and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, memberId)
        )),
      db.delete(projectMembers)
        .where(and(
          eq(projectMembers.userId, memberId),
          inArray(projectMembers.projectId, workspaceProjectIds)
        )),
    ])

    return { success: true }
  } catch (error) {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}