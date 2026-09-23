"use server"
import { randomUUID } from "crypto"
import { db } from "@/db"
import { eq, and, inArray, ne } from "drizzle-orm"
import { workspace, workspaceMembers, projectMembers, project, workspaceInvitation, notification, user, task, taskAssignees } from "@/db/schemas"
import { insertWorkspaceSchema, type InsertWorkspaceSchemaType } from "@/db/validations"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function createWorkspace(data: InsertWorkspaceSchemaType) {

    const session = await auth.api.getSession({ headers: await headers() });

    if (!session) {
        return { success: false , error: "UNAUTHENTICATED" }
    }

    const parsedData = insertWorkspaceSchema.safeParse(data);

    if (!parsedData.success) {
        return { success: false , error: "INVALID_DATA" }
    }


    const workspaceId = randomUUID();


    try {
        await db.batch([
            db.insert(workspace).values({
                id: workspaceId,
                name: data.name,
            }),
            db.insert(workspaceMembers).values({
                id: randomUUID(),
                workspaceId,
                userId: session.user.id,
                role: "owner",
            }),
            ])

        return { success: true, workspaceId: workspaceId }
         
    } catch (error) {
        return { success : false , error : "INTERNAL_ERROR" }
    }

}

export async function updateWorkspaceInfo(workspaceId: string, data: InsertWorkspaceSchemaType) {
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

    const parsedData = insertWorkspaceSchema.safeParse(data);

    if(!parsedData.success) {
        return { success: false , error: "INVALID_DATA" }
    }

    try {
        await db.update(workspace)
                .set({
                    name: parsedData.data.name,
                })
                .where(eq(workspace.id, workspaceId));

        return { success : true }
    } catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }

}

export async function deleteWorkspace(workspaceId: string) {

    const session = await auth.api.getSession({ headers: await headers() });
    
        if (!session) {
            return { success: false, error: "UNAUTHENTICATED" }
        }
    
        const membership = await db.query.workspaceMembers.findFirst({
            where: and(
                eq(workspaceMembers.workspaceId, workspaceId),
                eq(workspaceMembers.userId, session.user.id)
            )
        });
    
        if (!membership) {
            return { success: false, error: "UNAUTHORIZED" }
        }
    
        const canEdit = membership.role === "owner" || membership.role === "admin";
        if (!canEdit) {
            return { success: false, error: "FORBIDDEN" }
        }

try {
        await db.delete(workspace)
            .where(eq(workspace.id, workspaceId));
        return { success: true }

    }catch (error) {
        return { success: false, error: "INTERNAL_SERVER_ERROR" }
    }


}

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

    const projectIds = await db.query.project.findMany({
      where: eq(project.workspaceId, workspaceId),
      columns: { id: true },
    })

    const projectTaskIds =
      projectIds.length > 0
        ? await db.query.task.findMany({
            where: inArray(
              task.projectId,
              projectIds.map((p) => p.id)
            ),
            columns: { id: true, title: true },
          })
        : []

    const taskIds = projectTaskIds.map((t) => t.id)

    const memberAssignments =
      taskIds.length > 0
        ? await db.query.taskAssignees.findMany({
            where: and(
              eq(taskAssignees.userId, memberId),
              inArray(taskAssignees.taskId, taskIds)
            ),
            columns: { taskId: true },
          })
        : []

    const removedTaskIds = memberAssignments.map((a) => a.taskId)
    const removedTitles = projectTaskIds
      .filter((t) => removedTaskIds.includes(t.id))
      .map((t) => t.title)

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

    if (removedTaskIds.length > 0) {
      await db.delete(taskAssignees)
        .where(and(
          eq(taskAssignees.userId, memberId),
          inArray(taskAssignees.taskId, removedTaskIds)
        ))
    }

    try {
      const managers = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          ne(workspaceMembers.role, "member"),
          ne(workspaceMembers.userId, memberId)
        ),
        columns: { userId: true },
      })

      if (managers.length > 0) {
        const [memberRow, workspaceRow] = await Promise.all([
          db.query.user.findFirst({
            where: eq(user.id, memberId),
            columns: { name: true },
          }),
          db.query.workspace.findFirst({
            where: eq(workspace.id, workspaceId),
            columns: { name: true },
          }),
        ])

        const memberName = memberRow?.name ?? "A member"
        const workspaceName = workspaceRow?.name ?? "the workspace"
        const body =
          removedTitles.length > 0
            ? `${memberName} was removed from ${workspaceName}. Tasks now unassigned: ${removedTitles.map((t) => `"${t}"`).join(", ")}.`
            : `${memberName} was removed from ${workspaceName}.`

        for (const manager of managers) {
          try {
            await db.insert(notification).values({
              id: randomUUID(),
              userId: manager.userId,
              actorId: actor.data.actorId,
              workspaceId,
              type: "member_removed",
              body,
            })
          } catch (error) {
            console.error("Error notifying manager of removed member:", error)
          }
        }
      }
    } catch (error) {
      console.error("Error notifying managers:", error)
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: "INTERNAL_SERVER_ERROR" }
  }
}