import { randomUUID } from "crypto"
import { db } from "@/db"
import {
  notification,
  task,
  workspaceMembers,
  taskAssignees,
  taskDependencies,
  project,
} from "@/db/schemas"
import { and, eq, inArray, ne } from "drizzle-orm"

export type NotificationTypeName = (typeof notification.$inferInsert)["type"]

export async function createNotification({
  userId,
  actorId = null,
  workspaceId = null,
  projectId = null,
  taskId = null,
  type,
  body,
}: {
  userId: string
  actorId?: string | null
  workspaceId?: string | null
  projectId?: string | null
  taskId?: string | null
  type: NotificationTypeName
  body: string
}) {
  await db.insert(notification).values({
    id: randomUUID(),
    userId,
    actorId: actorId ?? null,
    workspaceId: workspaceId ?? null,
    projectId: projectId ?? null,
    taskId: taskId ?? null,
    type,
    body,
    isRead: false,
  })
}

export async function hasNotified({
  userId,
  taskId,
  type,
}: {
  userId: string
  taskId: string
  type: NotificationTypeName
}) {
  const existing = await db.query.notification.findFirst({
    where: and(
      eq(notification.userId, userId),
      eq(notification.taskId, taskId),
      eq(notification.type, type)
    ),
    columns: { id: true },
  })
  return Boolean(existing)
}

const OVERDUE_WINDOW_MS = 24 * 60 * 60 * 1000

export async function clearTaskDateNotifications(taskId: string) {
    await db.delete(notification).where(
        and(
            eq(notification.taskId, taskId),
            inArray(notification.type, [
                "task_overdue",
                "deadline_approaching",
            ] as NotificationTypeName[])
        )
    )
}

/**
 * Lazy scan run when the app opens. Detects tasks that became overdue,
 * deadlines approaching within the next 24h, tasks blocked by an overdue
 * dependency (Dependency Overdue flag), and dependencies that got back on
 * track. Notifications are created once per (user, task, type) so repeated
 * scans are idempotent.
 */
export async function runNotificationsScan(userId: string) {
  const now = Date.now()

  const memberships = await db.query.workspaceMembers.findMany({
    where: eq(workspaceMembers.userId, userId),
    columns: { workspaceId: true },
    with: {
      workspace: { columns: { id: true, name: true } },
    },
  })

  if (memberships.length === 0) return

  const workspaceIds = memberships.map((m) => m.workspaceId)
  const workspaceNameById = new Map(
    memberships.map((m) => [m.workspaceId, m.workspace.name])
  )

  const projects = await db.query.project.findMany({
    where: inArray(project.workspaceId, workspaceIds),
    columns: { id: true, workspaceId: true },
  })

  if (projects.length === 0) return

  const projectIds = projects.map((p) => p.id)
  const workspaceByProjectId = new Map(
    projects.map((p) => [p.id, p.workspaceId])
  )

  const tasks = await db.query.task.findMany({
    where: inArray(task.projectId, projectIds),
    columns: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      dueDate: true,
    },
  })

  if (tasks.length === 0) return

  const taskIds = tasks.map((t) => t.id)
  const taskById = new Map(tasks.map((t) => [t.id, t]))

  const managers = await db.query.workspaceMembers.findMany({
    where: and(
      inArray(workspaceMembers.workspaceId, workspaceIds),
      ne(workspaceMembers.role, "member")
    ),
    columns: { workspaceId: true, userId: true },
  })
  const managerIdsByWorkspace = new Map<string, string[]>()
  for (const m of managers) {
    const list = managerIdsByWorkspace.get(m.workspaceId) ?? []
    list.push(m.userId)
    managerIdsByWorkspace.set(m.workspaceId, list)
  }

  const assignmentRows = await db.query.taskAssignees.findMany({
    where: inArray(taskAssignees.taskId, taskIds),
    columns: { taskId: true, userId: true },
  })
  const assigneeIdsByTask = new Map<string, string[]>()
  for (const a of assignmentRows) {
    const list = assigneeIdsByTask.get(a.taskId) ?? []
    if (!list.includes(a.userId)) list.push(a.userId)
    assigneeIdsByTask.set(a.taskId, list)
  }

  const dependencyRows = await db.query.taskDependencies.findMany({
    where: inArray(taskDependencies.taskId, taskIds),
    columns: { taskId: true, dependsOnId: true },
  })
  const dependsOnByTask = new Map<string, string[]>()
  const blockedByTask = new Map<string, string[]>()
  for (const d of dependencyRows) {
    if (!taskById.has(d.dependsOnId)) continue
    const deps = dependsOnByTask.get(d.taskId) ?? []
    deps.push(d.dependsOnId)
    dependsOnByTask.set(d.taskId, deps)
    const blocked = blockedByTask.get(d.dependsOnId) ?? []
    blocked.push(d.taskId)
    blockedByTask.set(d.dependsOnId, blocked)
  }

  const getDepsOf = (taskId: string) => dependsOnByTask.get(taskId) ?? []
  const getBlockedBy = (taskId: string) => blockedByTask.get(taskId) ?? []

  const isOverdue = (t: (typeof tasks)[number]) =>
    t.dueDate != null &&
    t.status !== "done" &&
    new Date(t.dueDate).getTime() < now

  const isApproaching = (t: (typeof tasks)[number]) =>
    t.dueDate != null &&
    t.status !== "done" &&
    new Date(t.dueDate).getTime() > now &&
    new Date(t.dueDate).getTime() <= now + OVERDUE_WINDOW_MS

  const workspaceName = (projectId: string) =>
    workspaceNameById.get(workspaceByProjectId.get(projectId) ?? "") ?? ""

  const notifyAssignees = async ({
    projectId,
    taskId,
    type,
    body,
  }: {
    projectId: string
    taskId: string
    type: NotificationTypeName
    body: string
  }) => {
    for (const assigneeId of assigneeIdsByTask.get(taskId) ?? []) {
      if (await hasNotified({ userId: assigneeId, taskId, type })) continue
      await createNotification({
        userId: assigneeId,
        workspaceId: workspaceByProjectId.get(projectId) ?? null,
        projectId,
        taskId,
        type,
        body,
      })
    }
  }

  const notifyManagers = async ({
    projectId,
    taskId,
    type,
    body,
  }: {
    projectId: string
    taskId: string
    type: NotificationTypeName
    body: string
  }) => {
    const workspaceId = workspaceByProjectId.get(projectId)
    if (!workspaceId) return
    for (const managerId of managerIdsByWorkspace.get(workspaceId) ?? []) {
      if (await hasNotified({ userId: managerId, taskId, type })) continue
      await createNotification({
        userId: managerId,
        workspaceId,
        projectId,
        taskId,
        type,
        body,
      })
    }
  }

  const overdueTasks = tasks.filter(isOverdue)

  for (const t of overdueTasks) {
    const wsName = workspaceName(t.projectId)
    const blockedTitles = getBlockedBy(t.id)
      .map((dId) => taskById.get(dId))
      .filter((d) => d && d.status !== "done")
      .map((d) => `${d!.title.trim().length > 0 ? `"${d!.title}"` : "a task"}`)

    const overdueBody = `Task "${t.title}" in ${wsName} is overdue.`
    await notifyAssignees({
      projectId: t.projectId,
      taskId: t.id,
      type: "task_overdue",
      body: overdueBody,
    })

    const managerBody =
      blockedTitles.length > 0
        ? `Task "${t.title}" in ${wsName} is overdue and blocking ${blockedTitles.join(", ")}.`
        : `Task "${t.title}" in ${wsName} is overdue.`
    await notifyManagers({
      projectId: t.projectId,
      taskId: t.id,
      type: "task_overdue",
      body: managerBody,
    })

    for (const dependentId of getBlockedBy(t.id)) {
      const dependent = taskById.get(dependentId)
      if (!dependent || dependent.status === "done") continue
      const depBody = `"${dependent.title}" can't start — dependency "${t.title}" is overdue.`
      await notifyAssignees({
        projectId: t.projectId,
        taskId: dependentId,
        type: "dependency_overdue",
        body: depBody,
      })
      await notifyManagers({
        projectId: t.projectId,
        taskId: dependentId,
        type: "dependency_overdue",
        body: depBody,
      })
    }
  }

  for (const t of tasks.filter(isApproaching)) {
    const body = `Task "${t.title}" in ${workspaceName(t.projectId)} is due soon.`
    await notifyAssignees({
      projectId: t.projectId,
      taskId: t.id,
      type: "deadline_approaching",
      body,
    })
  }

  const flaggedRows = await db.query.notification.findMany({
    where: and(
      eq(notification.userId, userId),
      eq(notification.type, "dependency_overdue"),
      inArray(notification.taskId, taskIds)
    ),
    columns: { id: true, taskId: true },
  })

  for (const flag of flaggedRows) {
    const blockedId = flag.taskId!
    const blocked = taskById.get(blockedId)
    if (!blocked || blocked.status === "done") continue

    const stillHasOverdueDep = getDepsOf(blockedId).some(
      (depId) => {
        const dep = taskById.get(depId)
        return dep ? isOverdue(dep) : false
      }
    )

    if (stillHasOverdueDep) continue

    const wsName = workspaceName(blocked.projectId)
    const body = `"${blocked.title}" in ${wsName} is no longer blocked by an overdue dependency.`
    await notifyAssignees({
      projectId: blocked.projectId,
      taskId: blockedId,
      type: "dependency_resolved",
      body,
    })
    await notifyManagers({
      projectId: blocked.projectId,
      taskId: blockedId,
      type: "dependency_resolved",
      body,
    })

    await db.delete(notification).where(
      and(
        eq(notification.taskId, blockedId),
        eq(notification.type, "dependency_overdue")
      )
    )
  }
}