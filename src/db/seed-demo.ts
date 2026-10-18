import { hashPassword } from "better-auth/crypto"
import { eq, inArray, like } from "drizzle-orm"
import { db } from "./index"
import {
  account,
  activity,
  notification,
  project,
  projectMembers,
  task,
  taskAssignees,
  taskDependencies,
  user,
  workspace,
  workspaceMembers,
} from "./schemas"

type PersonKey = "dana" | "marco" | "priya" | "tom"
type Role = "owner" | "admin" | "member"
type TaskStatus = "todo" | "in_progress" | "in_review" | "done" | "blocked"
type TaskPriority = "low" | "medium" | "high" | "urgent"

type DemoPerson = {
  key: PersonKey
  id: string
  name: string
  username: string
  email: string
}

type TaskDef = {
  key: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dueIn?: number
  assignees?: PersonKey[]
  dependsOn?: string[]
}

type ProjectDef = {
  key: string
  name: string
  description: string
  tasks: TaskDef[]
}

type WorkspaceDef = {
  key: string
  id: string
  name: string
  members: { person: PersonKey; role: Role }[]
  projects: ProjectDef[]
}

type ActivityDef = {
  key: string
  workspaceKey: string
  projectKey: string
  actor: PersonKey
  type:
    | "task_created"
    | "task_status_changed"
    | "task_updated"
    | "task_assigned"
    | "dependency_added"
    | "project_created"
    | "member_added"
  entityType: string
  entityKey: string
  hoursAgo: number
  metadata?: Record<string, string>
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "Demo1234!"
const DAY = 86_400_000
const COLUMN_GAP = 340
const ROW_GAP = 170

const PEOPLE: DemoPerson[] = [
  {
    key: "dana",
    id: "usr_demo_dana",
    name: "Dana Ellis",
    username: "dana",
    email: "owner@example.com",
  },
  {
    key: "marco",
    id: "usr_demo_marco",
    name: "Marco Silva",
    username: "marco",
    email: "admin@example.com",
  },
  {
    key: "priya",
    id: "usr_demo_priya",
    name: "Priya Nair",
    username: "priya",
    email: "member@example.com",
  },
  {
    key: "tom",
    id: "usr_demo_tom",
    name: "Tom Becker",
    username: "tom",
    email: "tom@example.com",
  },
]

const WORKSPACES: WorkspaceDef[] = [
  {
    key: "northwind",
    id: "ws_demo_northwind",
    name: "Northwind Studio",
    members: [
      { person: "dana", role: "owner" },
      { person: "marco", role: "admin" },
      { person: "priya", role: "member" },
      { person: "tom", role: "member" },
    ],
    projects: [
      {
        key: "website",
        name: "Website Redesign",
        description:
          "Rebuild the marketing site with a new visual language, cleaner information architecture and an accessibility pass.",
        tasks: [
          {
            key: "wireframes",
            title: "Wireframe the main flows",
            description:
              "Low fidelity frames for home, pricing, docs and sign-up.",
            status: "done",
            priority: "high",
            dueIn: -12,
            assignees: ["priya"],
          },
          {
            key: "content",
            title: "Content inventory and rewrite",
            description: "Audit every page and rewrite the copy that is stale.",
            status: "done",
            priority: "medium",
            dueIn: -8,
            assignees: ["tom"],
          },
          {
            key: "visual",
            title: "Visual design pass",
            description: "Apply the new type scale, spacing and colour tokens.",
            status: "in_review",
            priority: "high",
            dueIn: 2,
            assignees: ["priya"],
            dependsOn: ["wireframes"],
          },
          {
            key: "homepage",
            title: "Build the new homepage",
            description: "Hero, feature grid, testimonials and the footer.",
            status: "in_progress",
            priority: "urgent",
            dueIn: -3,
            assignees: ["marco"],
            dependsOn: ["visual", "content"],
          },
          {
            key: "pricing",
            title: "Build the pricing page",
            description: "Three tier comparison with an FAQ underneath.",
            status: "todo",
            priority: "medium",
            dueIn: 9,
            assignees: ["marco"],
            dependsOn: ["homepage"],
          },
          {
            key: "seo",
            title: "SEO and metadata pass",
            description: "Titles, descriptions, sitemap, Open Graph images.",
            status: "todo",
            priority: "low",
            dueIn: 14,
            assignees: ["tom"],
            dependsOn: ["homepage"],
          },
          {
            key: "a11y",
            title: "Accessibility audit",
            description:
              "Keyboard traps, contrast, focus order and screen reader labels.",
            status: "blocked",
            priority: "high",
            dueIn: 6,
            assignees: ["priya"],
            dependsOn: ["homepage"],
          },
          {
            key: "launch",
            title: "Launch the redesign",
            description: "DNS switch, redirects and a rollback plan.",
            status: "todo",
            priority: "urgent",
            dueIn: 21,
            assignees: ["dana"],
            dependsOn: ["seo", "a11y"],
          },
        ],
      },
      {
        key: "mobile",
        name: "Companion Mobile App",
        description:
          "A thin mobile client that talks to the existing API and mirrors the board.",
        tasks: [
          {
            key: "contract",
            title: "Agree the API contract",
            description: "Freeze the endpoints and payload shapes for v1.",
            status: "done",
            priority: "high",
            dueIn: -6,
            assignees: ["marco"],
          },
          {
            key: "auth",
            title: "Auth and onboarding screens",
            description: "Sign in, sign up, forgotten password, empty states.",
            status: "in_progress",
            priority: "high",
            dueIn: 1,
            assignees: ["priya"],
            dependsOn: ["contract"],
          },
          {
            key: "push",
            title: "Push notifications",
            description: "Device registration and the notification tap handler.",
            status: "blocked",
            priority: "medium",
            dueIn: -1,
            assignees: ["tom"],
            dependsOn: ["contract"],
          },
          {
            key: "offline",
            title: "Offline cache",
            description: "Cache the board so it opens without a connection.",
            status: "todo",
            priority: "low",
            dueIn: 18,
            assignees: ["marco"],
          },
          {
            key: "beta",
            title: "Closed beta release",
            description: "TestFlight and Play internal track builds.",
            status: "todo",
            priority: "high",
            dueIn: 24,
            assignees: ["dana"],
            dependsOn: ["auth", "push"],
          },
        ],
      },
    ],
  },
  {
    key: "lumen",
    id: "ws_demo_lumen",
    name: "Lumen Labs",
    members: [
      { person: "dana", role: "owner" },
      { person: "tom", role: "member" },
    ],
    projects: [
      {
        key: "brand",
        name: "Brand Refresh",
        description: "A quieter palette and a proper type system for the print and web collateral.",
        tasks: [
          {
            key: "moodboard",
            title: "Collect the moodboard",
            description: "Reference boards covering tone, texture and colour.",
            status: "done",
            priority: "medium",
            dueIn: -9,
            assignees: ["dana"],
          },
          {
            key: "logo",
            title: "Logo exploration",
            description: "Three directions, then one to refine.",
            status: "in_review",
            priority: "high",
            dueIn: 3,
            assignees: ["dana"],
            dependsOn: ["moodboard"],
          },
          {
            key: "type",
            title: "Type scale and pairing",
            description: "Pick the pairing and define the scale end to end.",
            status: "todo",
            priority: "medium",
            dueIn: 7,
            assignees: ["tom"],
            dependsOn: ["moodboard"],
          },
          {
            key: "guide",
            title: "Publish the brand guide",
            description: "One document covering usage rules and do-nots.",
            status: "todo",
            priority: "low",
            dueIn: 16,
            assignees: ["dana"],
            dependsOn: ["logo", "type"],
          },
        ],
      },
    ],
  },
]

const ACTIVITY: ActivityDef[] = [
  {
    key: "a1",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "dana",
    type: "project_created",
    entityType: "project",
    entityKey: "pj_demo_website",
    hoursAgo: 720,
    metadata: { name: "Website Redesign" },
  },
  {
    key: "a2",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "dana",
    type: "member_added",
    entityType: "member",
    entityKey: "usr_demo_marco",
    hoursAgo: 700,
    metadata: { name: "Marco Silva" },
  },
  {
    key: "a3",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "priya",
    type: "task_created",
    entityType: "task",
    entityKey: "tsk_demo_wireframes",
    hoursAgo: 600,
    metadata: { title: "Wireframe the main flows" },
  },
  {
    key: "a4",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "priya",
    type: "task_status_changed",
    entityType: "task",
    entityKey: "tsk_demo_wireframes",
    hoursAgo: 540,
    metadata: { title: "Wireframe the main flows", from: "in_review", to: "done" },
  },
  {
    key: "a5",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "marco",
    type: "dependency_added",
    entityType: "task",
    entityKey: "tsk_demo_visual",
    hoursAgo: 480,
    metadata: { title: "Visual design pass" },
  },
  {
    key: "a6",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "marco",
    type: "task_status_changed",
    entityType: "task",
    entityKey: "tsk_demo_homepage",
    hoursAgo: 72,
    metadata: { title: "Build the new homepage", from: "todo", to: "in_progress" },
  },
  {
    key: "a7",
    workspaceKey: "northwind",
    projectKey: "mobile",
    actor: "dana",
    type: "project_created",
    entityType: "project",
    entityKey: "pj_demo_mobile",
    hoursAgo: 400,
    metadata: { name: "Companion Mobile App" },
  },
  {
    key: "a8",
    workspaceKey: "northwind",
    projectKey: "mobile",
    actor: "priya",
    type: "task_assigned",
    entityType: "task",
    entityKey: "tsk_demo_auth",
    hoursAgo: 96,
    metadata: { title: "Auth and onboarding screens" },
  },
  {
    key: "a9",
    workspaceKey: "northwind",
    projectKey: "website",
    actor: "tom",
    type: "task_status_changed",
    entityType: "task",
    entityKey: "tsk_demo_a11y",
    hoursAgo: 30,
    metadata: { title: "Accessibility audit", from: "todo", to: "blocked" },
  },
  {
    key: "a10",
    workspaceKey: "lumen",
    projectKey: "brand",
    actor: "dana",
    type: "project_created",
    entityType: "project",
    entityKey: "pj_demo_brand",
    hoursAgo: 300,
    metadata: { name: "Brand Refresh" },
  },
  {
    key: "a11",
    workspaceKey: "lumen",
    projectKey: "brand",
    actor: "dana",
    type: "task_status_changed",
    entityType: "task",
    entityKey: "tsk_demo_logo",
    hoursAgo: 48,
    metadata: { title: "Logo exploration", from: "todo", to: "in_review" },
  },
  {
    key: "a12",
    workspaceKey: "lumen",
    projectKey: "brand",
    actor: "tom",
    type: "task_updated",
    entityType: "task",
    entityKey: "tsk_demo_type",
    hoursAgo: 12,
    metadata: { title: "Type scale and pairing" },
  },
]

function daysFromNow(days: number) {
  return new Date(Date.now() + days * DAY)
}

function taskId(key: string) {
  return `tsk_demo_${key}`
}

function projectId(key: string) {
  return `pj_demo_${key}`
}

function layout(project: ProjectDef) {
  const byKey = new Map(project.tasks.map((def) => [def.key, def]))
  const depth = new Map<string, number>()

  const resolve = (key: string, seen: Set<string>): number => {
    const cached = depth.get(key)
    if (cached !== undefined) return cached
    if (seen.has(key)) return 0

    seen.add(key)
    const deps = (byKey.get(key)?.dependsOn ?? []).filter((dep) =>
      byKey.has(dep)
    )
    const value = deps.length === 0 ? 0 : Math.max(...deps.map((d) => resolve(d, seen))) + 1
    seen.delete(key)
    depth.set(key, value)
    return value
  }

  for (const def of project.tasks) resolve(def.key, new Set())

  const rows = new Map<number, number>()
  const positions = new Map<string, { x: number; y: number }>()

  for (const def of project.tasks) {
    const column = depth.get(def.key) ?? 0
    const row = rows.get(column) ?? 0
    rows.set(column, row + 1)
    positions.set(def.key, { x: column * COLUMN_GAP, y: row * ROW_GAP })
  }

  return positions
}

async function resetDemoData() {
  const workspaces = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(like(workspace.id, "ws_demo_%"))

  const workspaceIds = workspaces.map((row) => row.id)

  if (workspaceIds.length > 0) {
    await db
      .delete(notification)
      .where(inArray(notification.workspaceId, workspaceIds))
  }

  await db
    .delete(taskDependencies)
    .where(like(taskDependencies.id, "dep_demo_%"))
  await db.delete(workspace).where(like(workspace.id, "ws_demo_%"))
  await db.delete(user).where(like(user.id, "usr_demo_%"))

  console.log("Removed previous demo data.")
}

async function ensureAccount(userId: string) {
  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(eq(account.accountId, userId))
    .limit(1)

  if (existing.length > 0) {
    await db
      .update(account)
      .set({ password: await hashPassword(DEMO_PASSWORD) })
      .where(eq(account.id, existing[0].id))
    return
  }

  await db
    .insert(account)
    .values({
      id: `acc_demo_${userId}`,
      accountId: userId,
      providerId: "credential",
      userId,
      password: await hashPassword(DEMO_PASSWORD),
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoNothing()
}

async function resolvePeople(): Promise<Record<PersonKey, string>> {
  const ids = {} as Record<PersonKey, string>

  for (const person of PEOPLE) {
    const existing = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, person.email))
      .limit(1)

    if (existing.length > 0) {
      ids[person.key] = existing[0].id
      await db
        .update(user)
        .set({
          name: person.name,
          username: person.username,
          emailVerified: true,
        })
        .where(eq(user.id, existing[0].id))
      await ensureAccount(existing[0].id)
      continue
    }

    await db
      .insert(user)
      .values({
        id: person.id,
        name: person.name,
        username: person.username,
        email: person.email,
        emailVerified: true,
      })
      .onConflictDoNothing()

    const [created] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, person.email))
      .limit(1)

    if (!created) {
      throw new Error(
        `Could not create ${person.email} — the username "${person.username}" is probably taken.`
      )
    }

    ids[person.key] = created.id
    await ensureAccount(created.id)
  }

  return ids
}

async function seedWorkspaces(ids: Record<PersonKey, string>) {
  const now = new Date()

  await db
    .insert(workspace)
    .values(
      WORKSPACES.map((ws, index) => ({
        id: ws.id,
        name: ws.name,
        createdAt: new Date(now.getTime() - (60 - index * 20) * DAY),
        updatedAt: new Date(now.getTime() - (60 - index * 20) * DAY),
      }))
    )
    .onConflictDoNothing()

  await db
    .insert(workspaceMembers)
    .values(
      WORKSPACES.flatMap((ws) =>
        ws.members.map((member, index) => ({
          id: `wmm_demo_${ws.key}_${member.person}`,
          workspaceId: ws.id,
          userId: ids[member.person],
          role: member.role,
          joinedAt: new Date(now.getTime() - (55 - index * 3) * DAY),
        }))
      )
    )
    .onConflictDoNothing()
}

async function seedProjects(ids: Record<PersonKey, string>) {
  const now = new Date()

  await db
    .insert(project)
    .values(
      WORKSPACES.flatMap((ws) =>
        ws.projects.map((proj, index) => ({
          id: projectId(proj.key),
          workspaceId: ws.id,
          name: proj.name,
          description: proj.description,
          createdAt: new Date(now.getTime() - (40 - index * 8) * DAY),
          updatedAt: now,
        }))
      )
    )
    .onConflictDoNothing()

  await db
    .insert(projectMembers)
    .values(
      WORKSPACES.flatMap((ws) =>
        ws.projects.flatMap((proj) =>
          ws.members.map((member, index) => ({
            id: `pm_demo_${proj.key}_${member.person}`,
            projectId: projectId(proj.key),
            userId: ids[member.person],
            joinedAt: new Date(now.getTime() - (35 - index * 3) * DAY),
          }))
        )
      )
    )
    .onConflictDoNothing()
}

async function seedTasks(ids: Record<PersonKey, string>) {
  const now = new Date()

  const taskRows: (typeof task.$inferInsert)[] = []
  const assigneeRows: (typeof taskAssignees.$inferInsert)[] = []
  const dependencyRows: (typeof taskDependencies.$inferInsert)[] = []

  for (const ws of WORKSPACES) {
    const creatorId = ids[ws.members[0].person]

    for (const proj of ws.projects) {
      const positions = layout(proj)

      for (const [index, def] of proj.tasks.entries()) {
        const position = positions.get(def.key) ?? { x: 0, y: index * ROW_GAP }
        const created = new Date(now.getTime() - Math.max(1, 25 - index) * DAY)

        taskRows.push({
          id: taskId(def.key),
          projectId: projectId(proj.key),
          createdBy: creatorId,
          title: def.title,
          description: def.description,
          status: def.status,
          priority: def.priority,
          positionX: position.x,
          positionY: position.y,
          dueDate: def.dueIn === undefined ? null : daysFromNow(def.dueIn),
          createdAt: created,
          updatedAt: created,
        })

        for (const person of def.assignees ?? []) {
          assigneeRows.push({
            id: `ta_demo_${def.key}_${person}`,
            taskId: taskId(def.key),
            userId: ids[person],
            assignedAt: created,
          })
        }

        for (const blocker of def.dependsOn ?? []) {
          dependencyRows.push({
            id: `dep_demo_${def.key}_${blocker}`,
            taskId: taskId(def.key),
            dependsOnId: taskId(blocker),
            createdAt: created,
          })
        }
      }
    }
  }

  await db.insert(task).values(taskRows).onConflictDoNothing()
  await db.insert(taskAssignees).values(assigneeRows).onConflictDoNothing()
  await db
    .insert(taskDependencies)
    .values(dependencyRows)
    .onConflictDoNothing()
}

async function seedActivity(ids: Record<PersonKey, string>) {
  await db
    .insert(activity)
    .values(
      ACTIVITY.map((item) => {
        const ws = WORKSPACES.find((w) => w.key === item.workspaceKey)
        if (!ws) throw new Error(`Unknown workspace: ${item.workspaceKey}`)

        return {
          id: `act_demo_${item.key}`,
          workspaceId: ws.id,
          projectId: projectId(item.projectKey),
          actorId: ids[item.actor],
          type: item.type,
          entityType: item.entityType,
          entityId: item.entityKey,
          metadata: item.metadata ?? {},
          createdAt: new Date(Date.now() - item.hoursAgo * 60 * 60 * 1000),
        }
      })
    )
    .onConflictDoNothing()
}

async function main() {
  await resetDemoData()

  const ids = await resolvePeople()

  await seedWorkspaces(ids)
  await seedProjects(ids)
  await seedTasks(ids)
  await seedActivity(ids)

  const taskCount = WORKSPACES.flatMap((ws) =>
    ws.projects.flatMap((proj) => proj.tasks)
  ).length

  console.log("")
  console.log("Demo data ready.")
  console.log("")
  console.log(
    `Workspaces: ${WORKSPACES.map((ws) => ws.name).join(", ")}`
  )
  console.log(`Projects:   ${WORKSPACES.flatMap((ws) => ws.projects.map((p) => p.name)).join(", ")}`)
  console.log(`Tasks:      ${taskCount}`)
  console.log("")
  console.log("Sign in with any of these (password is the same for all):")
  console.log("")
  for (const person of PEOPLE) {
    console.log(`  ${person.email.padEnd(22)} ${person.name}`)
  }
  console.log("")
  console.log(`  password: ${DEMO_PASSWORD}`)
  console.log("")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Demo seed failed:", error)
    process.exit(1)
  })
