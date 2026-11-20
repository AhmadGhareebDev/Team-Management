import { randomUUID } from "crypto"
import { and, eq, inArray } from "drizzle-orm"
import { after } from "next/server"
import { db } from "@/db"
import {
  assistantProposal,
  task,
  taskAssignees,
  taskDependencies,
} from "@/db/schemas"
import { getAssistantAccess } from "@/lib/assistant/access"
import { validateProposalArguments } from "@/lib/assistant/proposals"
import { getUserProjectAccess } from "@/db/queries/project"
import { recordActivity } from "@/lib/activity"
import { clearTaskDateNotifications, createNotification } from "@/lib/notifications"
import {
  publishCanvasDeletes,
  publishCanvasUpserts,
  publishWorkspaceInvalidation,
} from "@/lib/ably-server"
import { planTaskBatch, type PlannedTask } from "@/lib/tasks/task-batch"
import { syncTasksBlocked } from "@/lib/tasks/blocked"

type BatchQuery = Parameters<typeof db.batch>[0][number]

type ProposalResult =
  | {
      ok: true
      status: "applied" | "rejected"
      deletedTaskIds: string[]
      changedTaskIds: string[]
    }
  | { ok: false; error: string }

function unique(values: string[]) {
  return [...new Set(values)]
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null) return false
  const value = error as { code?: unknown; cause?: { code?: unknown } }
  return value.code === "23505" || value.cause?.code === "23505"
}

async function loadProposalForUser(userId: string, proposalId: string) {
  const proposal = await db.query.assistantProposal.findFirst({
    where: eq(assistantProposal.id, proposalId),
    columns: {
      id: true,
      threadId: true,
      payload: true,
      status: true,
    },
    with: {
      thread: {
        columns: {
          userId: true,
          projectId: true,
        },
      },
    },
  })

  if (!proposal || proposal.thread.userId !== userId) return null
  return { ...proposal, projectId: proposal.thread.projectId }
}

function notifyUnblockedDependents({
  actorId,
  workspaceId,
  projectId,
  dependentIds,
}: {
  actorId: string
  workspaceId: string
  projectId: string
  dependentIds: string[]
}) {
  if (dependentIds.length === 0) return

  after(async () => {
    try {
      const dependents = await db.query.task.findMany({
        where: inArray(task.id, dependentIds),
        columns: { id: true, title: true },
      })
      const assignees = await db.query.taskAssignees.findMany({
        where: inArray(taskAssignees.taskId, dependentIds),
        columns: { taskId: true, userId: true },
      })

      for (const dependent of dependents) {
        const userIds = assignees
          .filter((item) => item.taskId === dependent.id)
          .map((item) => item.userId)
          .filter((userId) => userId !== actorId)

        for (const userId of userIds) {
          try {
            await createNotification({
              userId,
              actorId,
              workspaceId,
              projectId,
              taskId: dependent.id,
              type: "task_unblocked",
              body: `Task "${dependent.title}" is no longer blocked. You can start now.`,
            })
          } catch (error) {
            console.error("Error notifying unblocked task assignee:", error)
          }
        }
      }
    } catch (error) {
      console.error("Error loading unblocked task assignees:", error)
    }
  })
}

// Records activity after the board write has succeeded.
function recordProposalActivity({
  plan,
  update,
  deleteItems,
  dependencyAdds,
  dependencyRemoves,
  titles,
  workspaceId,
  projectId,
  actorId,
}: {
  plan: PlannedTask[]
  update: { taskId: string; dueDate?: string | null }[]
  deleteItems: { taskId: string }[]
  dependencyAdds: { taskId: string; dependsOnTaskId: string }[]
  dependencyRemoves: { taskId: string; dependsOnTaskId: string }[]
  titles: Map<string, string>
  workspaceId: string
  projectId: string
  actorId: string
}) {
  after(async () => {
    for (const item of plan) {
      await recordActivity({
        workspaceId,
        projectId,
        actorId,
        type: "task_created",
        entityType: "task",
        entityId: item.id,
        metadata: { title: item.title },
      })
    }

    for (const item of update) {
      await recordActivity({
        workspaceId,
        projectId,
        actorId,
        type: "task_updated",
        entityType: "task",
        entityId: item.taskId,
        metadata: { title: titles.get(item.taskId) ?? item.taskId },
      })
    }

    for (const item of deleteItems) {
      await recordActivity({
        workspaceId,
        projectId,
        actorId,
        type: "task_deleted",
        entityType: "task",
        entityId: item.taskId,
        metadata: { title: titles.get(item.taskId) ?? item.taskId },
      })
    }

    for (const item of dependencyAdds) {
      await recordActivity({
        workspaceId,
        projectId,
        actorId,
        type: "dependency_added",
        entityType: "task",
        entityId: item.taskId,
        metadata: {
          title: titles.get(item.taskId) ?? item.taskId,
          name: titles.get(item.dependsOnTaskId) ?? item.dependsOnTaskId,
        },
      })
    }

    for (const item of dependencyRemoves) {
      await recordActivity({
        workspaceId,
        projectId,
        actorId,
        type: "dependency_removed",
        entityType: "task",
        entityId: item.taskId,
        metadata: {
          title: titles.get(item.taskId) ?? item.taskId,
          name: titles.get(item.dependsOnTaskId) ?? item.dependsOnTaskId,
        },
      })
    }
  })
}

// Applies one pending proposal after reauthorizing the current user.
export async function applyAssistantProposal({
  userId,
  proposalId,
}: {
  userId: string
  proposalId: string
}): Promise<ProposalResult> {
  const proposal = await loadProposalForUser(userId, proposalId)
  if (!proposal) return { ok: false, error: "Proposal not found." }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal is no longer pending." }
  }

  const access = await getUserProjectAccess(proposal.projectId, userId)
  if (!access) return { ok: false, error: "Project not found." }
  if (!getAssistantAccess(access).canManage) {
    return { ok: false, error: "Only project owners and admins can apply proposals." }
  }

  const validation = await validateProposalArguments(
    proposal.projectId,
    JSON.stringify(proposal.payload)
  )
  if (!validation.ok) {
    return { ok: false, error: `This proposal is no longer valid: ${validation.error}` }
  }

  const payload = validation.payload
  const createItems = payload.create ?? []
  const updateItems = payload.update ?? []
  const deleteItems = payload.delete ?? []
  const dependencyAdds = payload.dependencies?.add ?? []
  const dependencyRemoves = payload.dependencies?.remove ?? []

  let plan: Extract<Awaited<ReturnType<typeof planTaskBatch>>, { ok: true }> | null =
    null

  if (createItems.length > 0) {
    const result = await planTaskBatch({
      projectId: proposal.projectId,
      items: createItems.map((item) => ({
        ref: item.ref,
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        dependsOn: item.dependsOn,
      })),
    })
    if (!result.ok) {
      return { ok: false, error: result.issues.join(" ") }
    }
    plan = result
  }

  const existingTasks = await db.query.task.findMany({
    where: eq(task.projectId, proposal.projectId),
    columns: { id: true, title: true, status: true },
  })
  const titles = new Map(existingTasks.map((item) => [item.id, item.title]))
  for (const item of plan?.tasks ?? []) titles.set(item.id, item.title)
  const statusBefore = new Map(existingTasks.map((item) => [item.id, item.status]))
  const deleteIds = deleteItems.map((item) => item.taskId)

  const dependentRows =
    deleteIds.length > 0
      ? await db.query.taskDependencies.findMany({
          where: inArray(taskDependencies.dependsOnId, deleteIds),
          columns: { taskId: true },
        })
      : []

  const createRefs = new Set(
    createItems
      .map((item) => item.ref)
      .filter((ref): ref is string => Boolean(ref))
  )
  const refToId = new Map(
    (plan?.tasks ?? [])
      .filter((item) => item.ref)
      .map((item) => [item.ref as string, item.id])
  )
  const plannedEdgeKeys = new Set(
    (plan?.tasks ?? []).flatMap((item) =>
      item.dependsOnTaskIds.map((id) => `${item.id}:${id}`)
    )
  )

  function resolveTaskId(value: string) {
    if (!createRefs.has(value)) return value
    const id = refToId.get(value)
    if (!id) throw new Error(`Could not resolve proposal ref "${value}".`)
    return id
  }

  const resolvedDependencyAdds = dependencyAdds.map((item) => ({
    taskId: resolveTaskId(item.taskId),
    dependsOnTaskId: resolveTaskId(item.dependsOnTaskId),
  }))
  const resolvedDependencyRemoves = dependencyRemoves.map((item) => ({
    taskId: item.taskId,
    dependsOnTaskId: item.dependsOnTaskId,
  }))

  const syncIds = unique([
    ...(plan?.tasks.map((item) => item.id) ?? []),
    ...resolvedDependencyAdds.map((item) => item.taskId),
    ...resolvedDependencyRemoves.map((item) => item.taskId),
    ...dependentRows.map((item) => item.taskId),
  ])
  const changedTaskIds = unique([
    ...(plan?.tasks.map((item) => item.id) ?? []),
    ...updateItems.map((item) => item.taskId),
    ...syncIds,
  ]).filter((id) => !deleteIds.includes(id))

  const [claimed] = await db
    .update(assistantProposal)
    .set({ status: "applying" })
    .where(
      and(eq(assistantProposal.id, proposalId), eq(assistantProposal.status, "pending"))
    )
    .returning({ id: assistantProposal.id })

  if (!claimed) {
    return { ok: false, error: "This proposal is already being handled." }
  }

  try {
    const queries: BatchQuery[] = []
    const plannedTasks = plan?.tasks ?? []

    for (const item of plannedTasks) {
      queries.push(
        db.insert(task).values({
          id: item.id,
          projectId: proposal.projectId,
          createdBy: userId,
          title: item.title,
          description: item.description,
          priority: item.priority,
          dueDate: item.dueDate,
          positionX: item.positionX,
          positionY: item.positionY,
        })
      )
    }

    for (const item of plannedTasks) {
      for (const dependsOnId of item.dependsOnTaskIds) {
        queries.push(
          db.insert(taskDependencies).values({
            id: randomUUID(),
            taskId: item.id,
            dependsOnId,
          })
        )
      }
    }

    for (const item of updateItems) {
      const patch: {
        title?: string
        description?: string | null
        priority?: "low" | "medium" | "high" | "urgent"
        dueDate?: Date | null
      } = {}

      if (item.title !== undefined) patch.title = item.title
      if (item.description !== undefined) patch.description = item.description
      if (item.priority !== undefined) patch.priority = item.priority
      if (item.dueDate !== undefined) {
        patch.dueDate = item.dueDate ? new Date(item.dueDate) : null
      }

      if (Object.keys(patch).length > 0) {
        queries.push(
          db
            .update(task)
            .set(patch)
            .where(
              and(eq(task.id, item.taskId), eq(task.projectId, proposal.projectId))
            )
        )
      }
    }

    for (const item of deleteItems) {
      queries.push(
        db
          .delete(task)
          .where(
            and(eq(task.id, item.taskId), eq(task.projectId, proposal.projectId))
          )
      )
    }

    for (const item of resolvedDependencyRemoves) {
      queries.push(
        db
          .delete(taskDependencies)
          .where(
            and(
              eq(taskDependencies.taskId, item.taskId),
              eq(taskDependencies.dependsOnId, item.dependsOnTaskId)
            )
          )
      )
    }

    const addedEdges = new Set<string>()
    for (const item of resolvedDependencyAdds) {
      const key = `${item.taskId}:${item.dependsOnTaskId}`
      if (plannedEdgeKeys.has(key) || addedEdges.has(key)) continue
      addedEdges.add(key)
      queries.push(
        db.insert(taskDependencies).values({
          id: randomUUID(),
          taskId: item.taskId,
          dependsOnId: item.dependsOnTaskId,
        })
      )
    }

    queries.push(
      db
        .update(assistantProposal)
        .set({ status: "applied" })
        .where(
          and(
            eq(assistantProposal.id, proposalId),
            eq(assistantProposal.status, "applying")
          )
        )
    )

    await db.batch(queries as [BatchQuery, ...BatchQuery[]])

    let changed: string[] = []
    try {
      changed = await syncTasksBlocked(syncIds)
    } catch (syncError) {
      console.error("Could not recompute blocked state after proposal apply:", syncError)
    }

    const unblocked = changed.filter(
      (id) => statusBefore.get(id) === "blocked" && !deleteIds.includes(id)
    )

    publishCanvasDeletes(proposal.projectId, deleteIds)
    publishCanvasUpserts(
      proposal.projectId,
      unique([...changedTaskIds, ...changed]).filter((id) => !deleteIds.includes(id))
    )
    publishWorkspaceInvalidation(access.workspaceId)

    if (unblocked.length > 0) {
      notifyUnblockedDependents({
        actorId: userId,
        workspaceId: access.workspaceId,
        projectId: proposal.projectId,
        dependentIds: unblocked,
      })
    }

    for (const item of updateItems) {
      if (item.dueDate !== undefined) {
        after(async () => {
          await clearTaskDateNotifications(item.taskId)
        })
      }
    }

    recordProposalActivity({
      plan: plannedTasks,
      update: updateItems,
      deleteItems,
      dependencyAdds: resolvedDependencyAdds,
      dependencyRemoves: resolvedDependencyRemoves,
      titles,
      workspaceId: access.workspaceId,
      projectId: proposal.projectId,
      actorId: userId,
    })

    return {
      ok: true,
      status: "applied",
      deletedTaskIds: deleteIds,
      changedTaskIds: unique([...changedTaskIds, ...changed]),
    }
  } catch (error) {
    console.error("Could not apply assistant proposal:", error)

    await db
      .update(assistantProposal)
      .set({ status: "pending" })
      .where(
        and(
          eq(assistantProposal.id, proposalId),
          eq(assistantProposal.status, "applying")
        )
      )

    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error:
          "This proposal conflicts with the current board. Ask the assistant to prepare a fresh proposal.",
      }
    }

    return { ok: false, error: "Could not apply the proposal. Please try again." }
  }
}

// Dismisses one pending proposal after reauthorizing the current user.
export async function dismissAssistantProposal({
  userId,
  proposalId,
}: {
  userId: string
  proposalId: string
}): Promise<ProposalResult> {
  const proposal = await loadProposalForUser(userId, proposalId)
  if (!proposal) return { ok: false, error: "Proposal not found." }
  if (proposal.status !== "pending") {
    return { ok: false, error: "This proposal is no longer pending." }
  }

  const access = await getUserProjectAccess(proposal.projectId, userId)
  if (!access) return { ok: false, error: "Project not found." }
  if (!getAssistantAccess(access).canManage) {
    return { ok: false, error: "Only project owners and admins can dismiss proposals." }
  }

  const [dismissed] = await db
    .update(assistantProposal)
    .set({ status: "rejected" })
    .where(
      and(eq(assistantProposal.id, proposalId), eq(assistantProposal.status, "pending"))
    )
    .returning({ id: assistantProposal.id })

  if (!dismissed) {
    return { ok: false, error: "This proposal is already being handled." }
  }

  return { ok: true, status: "rejected", deletedTaskIds: [], changedTaskIds: [] }
}
