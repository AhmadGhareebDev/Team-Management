import { randomUUID } from "crypto"
import { and, eq, inArray, or } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/db"
import {
  assistantProposal,
  taskDependencies,
  type AssistantProposalPayload,
} from "@/db/schemas"
import {
  buildDependencyGraph,
  wouldCreateCycle,
} from "@/lib/dependency-graph"
import { planTaskBatch, TASK_BATCH_MAX_TASKS } from "@/lib/tasks/task-batch"

const prioritySchema = z.enum(["low", "medium", "high", "urgent"])
const dateSchema = z
  .string()
  .trim()
  .nullable()
  .optional()
  .refine((value) => {
    if (!value?.trim()) return true
    return !Number.isNaN(Date.parse(value))
  }, "Invalid due date.")

const descriptionSchema = z.string().trim().max(2000).nullable().optional()

const createItemSchema = z.strictObject({
  ref: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Use a simple temporary ref like t1.")
    .nullable()
    .optional(),
  title: z.string().trim().min(1, "Every task needs a title.").max(255),
  description: descriptionSchema,
  priority: prioritySchema.optional(),
  dueDate: dateSchema,
  dependsOn: z.array(z.string().trim().min(1)).max(TASK_BATCH_MAX_TASKS).optional(),
})

const updateItemSchema = z
  .strictObject({
    taskId: z.string().trim().min(1),
    title: z.string().trim().min(1).max(255).optional(),
    description: descriptionSchema,
    priority: prioritySchema.optional(),
    dueDate: dateSchema,
  })
  .refine(
    (value) =>
      value.title !== undefined ||
      value.description !== undefined ||
      value.priority !== undefined ||
      value.dueDate !== undefined,
    "Each update must change at least one field."
  )

const deleteItemSchema = z.strictObject({
  taskId: z.string().trim().min(1),
})

const dependencyItemSchema = z.strictObject({
  taskId: z.string().trim().min(1),
  dependsOnTaskId: z.string().trim().min(1),
})

const dependenciesSchema = z
  .strictObject({
    add: z.array(dependencyItemSchema).max(50).optional(),
    remove: z.array(dependencyItemSchema).max(50).optional(),
  })
  .refine(
    (value) => (value.add?.length ?? 0) + (value.remove?.length ?? 0) > 0,
    "Dependencies must include at least one change."
   )

const proposalSchema = z
  .strictObject({
    summary: z.string().trim().min(1).max(500),
    create: z.array(createItemSchema).min(1).max(TASK_BATCH_MAX_TASKS).optional(),
    update: z.array(updateItemSchema).min(1).max(50).optional(),
    delete: z.array(deleteItemSchema).min(1).max(50).optional(),
    dependencies: dependenciesSchema.optional(),
  })
  .refine(
    (value) =>
      Boolean(value.create || value.update || value.delete || value.dependencies),
    "The proposal must include at least one change."
  )

function normalizeDueDate(value: string | null | undefined) {
  if (!value?.trim()) return value === null ? null : undefined
  return new Date(value).toISOString().slice(0, 10)
}

function normalizeDescription(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)]
}

function joinTitles(titles: string[], limit = 3) {
  const shown = titles.slice(0, limit).map((title) => `“${title}”`)
  const remaining = titles.length - shown.length
  return remaining > 0 ? `${shown.join(", ")}, +${remaining} more` : shown.join(", ")
}

function error(message: string) {
  return { ok: false as const, error: message }
}

// Validates a model-generated proposal before it is stored as pending.
export async function validateProposalArguments(
  projectId: string,
  rawArguments: string
) {
  let raw: unknown

  try {
    raw = JSON.parse(rawArguments)
  } catch {
    return error("The proposal arguments were not valid JSON.")
  }

  const parsed = proposalSchema.safeParse(raw)
  if (!parsed.success) {
    return error(parsed.error.issues[0]?.message ?? "The proposal is invalid.")
  }

  const create = parsed.data.create?.map((item) => ({
    ref: item.ref ?? null,
    title: item.title.trim(),
    description: normalizeDescription(item.description),
    priority: item.priority ?? "medium",
    dueDate: normalizeDueDate(item.dueDate),
    dependsOn: uniqueStrings(item.dependsOn ?? []),
  }))
  const update = parsed.data.update?.map((item) => ({
    taskId: item.taskId,
    ...(item.title !== undefined && { title: item.title.trim() }),
    ...(item.description !== undefined && {
      description: normalizeDescription(item.description),
    }),
    ...(item.priority !== undefined && { priority: item.priority }),
    ...(item.dueDate !== undefined && {
      dueDate: normalizeDueDate(item.dueDate),
    }),
  }))
  const deleteItems = parsed.data.delete?.map((item) => ({ taskId: item.taskId }))
  const dependencies = parsed.data.dependencies
    ? {
        ...(parsed.data.dependencies.add && {
          add: parsed.data.dependencies.add.map((item) => ({
            taskId: item.taskId,
            dependsOnTaskId: item.dependsOnTaskId,
          })),
        }),
        ...(parsed.data.dependencies.remove && {
          remove: parsed.data.dependencies.remove.map((item) => ({
            taskId: item.taskId,
            dependsOnTaskId: item.dependsOnTaskId,
          })),
        }),
      }
    : undefined

  const createRefs = new Set(
    create
      ?.map((item) => item.ref)
      .filter((ref): ref is string => Boolean(ref)) ?? []
  )
  const addDependencyEndpoints =
    dependencies?.add?.flatMap((item) => [item.taskId, item.dependsOnTaskId]) ??
    []
  const fixedTaskIds = [
    ...(update?.map((item) => item.taskId) ?? []),
    ...(deleteItems?.map((item) => item.taskId) ?? []),
    ...(dependencies?.remove?.flatMap((item) => [item.taskId, item.dependsOnTaskId]) ??
      []),
  ]

  if (create?.length) {
    const result = await planTaskBatch({
      projectId,
      items: create.map((item) => ({
        ref: item.ref,
        title: item.title,
        description: item.description,
        priority: item.priority,
        dueDate: item.dueDate ? new Date(item.dueDate) : null,
        dependsOn: item.dependsOn,
      })),
    })
    if (!result.ok) {
      return error(result.issues.join(" "))
    }
  }

  const projectTasks = await db.query.task.findMany({
    where: (table, { eq }) => eq(table.projectId, projectId),
    columns: { id: true, title: true },
  })
  const taskIdsInProject = new Set(projectTasks.map((item) => item.id))
  const titles = new Map(projectTasks.map((item) => [item.id, item.title]))

  for (const taskId of fixedTaskIds) {
    if (!taskIdsInProject.has(taskId)) {
      return error(`Task "${taskId}" is not in this project.`)
    }
  }

  for (const edge of dependencies?.remove ?? []) {
    if (createRefs.has(edge.taskId) || createRefs.has(edge.dependsOnTaskId)) {
      return error("Dependency removals must reference existing tasks.")
    }
  }

  for (const taskId of addDependencyEndpoints) {
    if (createRefs.has(taskId)) continue
    if (!taskIdsInProject.has(taskId)) {
      return error(`Task "${taskId}" is not in this project.`)
    }
  }

  const deletedIds = new Set(deleteItems?.map((item) => item.taskId) ?? [])
  const mutatedIds = new Set([
    ...(update?.map((item) => item.taskId) ?? []),
    ...[
      ...(dependencies?.add?.flatMap((item) => [item.taskId, item.dependsOnTaskId]) ??
        []),
      ...(dependencies?.remove?.flatMap((item) => [
        item.taskId,
        item.dependsOnTaskId,
      ]) ?? []),
    ].filter((taskId) => !createRefs.has(taskId)),
  ])

  for (const taskId of mutatedIds) {
    if (deletedIds.has(taskId)) {
      return error("The same task cannot be changed and deleted in one proposal.")
    }
  }

  if (create) {
    for (const item of create) {
      for (const dependency of item.dependsOn ?? []) {
        if (createRefs.has(dependency) || taskIdsInProject.has(dependency)) {
          if (deletedIds.has(dependency)) {
            return error("A new task cannot depend on a task deleted in this proposal.")
          }
          continue
        }
        return error(`"${item.title}" depends on an unknown task "${dependency}".`)
      }
    }
  }

  const addDependencyEdges = dependencies?.add ?? []
  const removeDependencyEdges = dependencies?.remove ?? []
  const addKeys = new Set<string>()
  const removeKeys = new Set<string>()

  for (const edge of addDependencyEdges) {
    if (edge.taskId === edge.dependsOnTaskId) {
      return error("A task cannot depend on itself.")
    }

    const key = `${edge.taskId}:${edge.dependsOnTaskId}`
    if (addKeys.has(key)) {
      return error("The same dependency is proposed more than once.")
    }
    addKeys.add(key)
  }

  for (const edge of removeDependencyEdges) {
    const key = `${edge.taskId}:${edge.dependsOnTaskId}`
    if (removeKeys.has(key)) {
      return error("The same dependency removal is proposed more than once.")
    }
    removeKeys.add(key)
  }

  for (const key of addKeys) {
    if (removeKeys.has(key)) {
      return error("The same dependency cannot be added and removed in one proposal.")
    }
  }

  const allTaskIds = [...taskIdsInProject]
  const dependencyRows =
    allTaskIds.length === 0
      ? []
      : await db.query.taskDependencies.findMany({
          where: or(
            inArray(taskDependencies.taskId, allTaskIds),
            inArray(taskDependencies.dependsOnId, allTaskIds)
          ),
          columns: { taskId: true, dependsOnId: true },
        })

  const existingEdges = new Set(
    dependencyRows.map((edge) => `${edge.taskId}:${edge.dependsOnId}`)
  )

  for (const key of addKeys) {
    if (existingEdges.has(key)) {
      return error("That dependency already exists.")
    }
  }

  for (const key of removeKeys) {
    if (!existingEdges.has(key)) {
      return error("That dependency does not exist.")
    }
  }

  const graphRows = dependencyRows.filter(
    (edge) => !removeKeys.has(`${edge.taskId}:${edge.dependsOnId}`)
  )
  const graph = buildDependencyGraph(graphRows)
  const createNode = (ref: string) => `ref:${ref}`

  for (const [index, item] of (create ?? []).entries()) {
    const source = item.ref ? createNode(item.ref) : `__new_${index}`

    for (const dependency of item.dependsOn) {
      const target = createRefs.has(dependency) ? createNode(dependency) : dependency
      const list = graph.get(source) ?? []
      graph.set(source, [...list, target])
    }
  }

  for (const edge of addDependencyEdges) {
    const taskId = createRefs.has(edge.taskId) ? createNode(edge.taskId) : edge.taskId
    const dependsOnTaskId = createRefs.has(edge.dependsOnTaskId)
      ? createNode(edge.dependsOnTaskId)
      : edge.dependsOnTaskId

    if (taskId === dependsOnTaskId) {
      return error("A task cannot depend on itself.")
    }

    if (wouldCreateCycle(graph, taskId, dependsOnTaskId)) {
      return error("Adding those dependencies would create a cycle.")
    }

    const list = graph.get(taskId) ?? []
    graph.set(taskId, [...list, dependsOnTaskId])
  }

  const parts: string[] = []
  if (create?.length) {
    parts.push(`create ${create.length} task${create.length === 1 ? "" : "s"} (${joinTitles(create.map((item) => item.title))})`)
  }
  if (update?.length) {
    parts.push(`update ${update.length} task${update.length === 1 ? "" : "s"} (${joinTitles(update.map((item) => titles.get(item.taskId) ?? item.taskId))})`)
  }
  if (deleteItems?.length) {
    parts.push(`delete ${deleteItems.length} task${deleteItems.length === 1 ? "" : "s"} (${joinTitles(deleteItems.map((item) => titles.get(item.taskId) ?? item.taskId))})`)
  }
  if (dependencies) {
    const added = dependencies.add?.length ?? 0
    const removed = dependencies.remove?.length ?? 0
    parts.push(`${added} dependenc${added === 1 ? "y" : "ies"} added, ${removed} removed`)
  }

  const payload: AssistantProposalPayload = {
    summary: parts.join("; "),
    ...(create && { create }),
    ...(update && { update }),
    ...(deleteItems && { delete: deleteItems }),
    ...(dependencies && { dependencies }),
  }

  return { ok: true as const, payload }
}

function isUniqueViolation(error: unknown) {
  if (typeof error !== "object" || error === null) return false
  const value = error as { code?: unknown; cause?: { code?: unknown } }
  return value.code === "23505" || value.cause?.code === "23505"
}

// Stores a validated proposal as the thread's single pending proposal.
export async function createPendingProposal({
  threadId,
  messageId,
  payload,
}: {
  threadId: string
  messageId: string
  payload: AssistantProposalPayload
}) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const [, inserted] = await db.batch([
        db
          .update(assistantProposal)
          .set({ status: "rejected" })
          .where(
            and(
              eq(assistantProposal.threadId, threadId),
              eq(assistantProposal.status, "pending")
            )
          ),
        db
          .insert(assistantProposal)
          .values({
            id: randomUUID(),
            threadId,
            messageId,
            payload,
            status: "pending",
          })
          .returning(),
      ])

      return inserted[0]
    } catch (error) {
      if (attempt === 0 && isUniqueViolation(error)) continue
      throw error
    }
  }

  throw new Error("Could not store assistant proposal")
}

// Loads proposals for a set of assistant messages.
export async function loadProposalsForMessages(messageIds: string[]) {
  if (messageIds.length === 0) return []

  return db.query.assistantProposal.findMany({
    where: inArray(assistantProposal.messageId, messageIds),
    columns: {
      id: true,
      threadId: true,
      messageId: true,
      payload: true,
      status: true,
      createdAt: true,
    },
  })
}

export const assistantProposalTool = {
  type: "function" as const,
  function: {
    name: "propose_board_changes",
    description:
      "Propose board changes for this project. Use only for task create, update, delete, or dependency changes. Never assign tasks and never propose status changes. Nothing is written until the user explicitly applies the proposal. For one task use a one-item create array. For a batch, use temp refs like t1 and point dependsOn at those refs or existing task IDs. Dependencies may point at existing task IDs or create refs.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description: "A short, specific summary of the proposed changes.",
        },
        create: {
          type: "array",
          minItems: 1,
          maxItems: TASK_BATCH_MAX_TASKS,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              ref: { type: "string" },
              title: { type: "string" },
              description: { type: ["string", "null"] },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              dueDate: { type: ["string", "null"], description: "YYYY-MM-DD or ISO date." },
              dependsOn: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["title"],
          },
        },
        update: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              taskId: { type: "string" },
              title: { type: "string" },
              description: { type: ["string", "null"] },
              priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
              dueDate: { type: ["string", "null"], description: "YYYY-MM-DD or ISO date." },
            },
            required: ["taskId"],
          },
        },
        delete: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            properties: { taskId: { type: "string" } },
            required: ["taskId"],
          },
        },
        dependencies: {
          type: "object",
          additionalProperties: false,
          properties: {
            add: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  taskId: { type: "string" },
                  dependsOnTaskId: { type: "string" },
                },
                required: ["taskId", "dependsOnTaskId"],
              },
            },
            remove: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  taskId: { type: "string" },
                  dependsOnTaskId: { type: "string" },
                },
                required: ["taskId", "dependsOnTaskId"],
              },
            },
          },
        },
      },
      required: ["summary"],
    },
  },
}
