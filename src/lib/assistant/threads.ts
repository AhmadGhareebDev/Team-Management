import { randomUUID } from "crypto"
import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  assistantMessage,
  assistantProposal,
  assistantThread,
} from "@/db/schemas"

export const ASSISTANT_HISTORY_LIMIT = 30

// Returns the user's chat for a project, or creates it if missing.
export async function findOrCreateThread(userId: string, projectId: string) {
  const existing = await findThread(userId, projectId)
  if (existing) return existing

  await db
    .insert(assistantThread)
    .values({ id: randomUUID(), userId, projectId })
    .onConflictDoNothing()

  const thread = await findThread(userId, projectId)
  if (!thread) throw new Error("Could not create assistant thread")

  return thread
}

// Returns the user's chat for a project without creating one.
export async function findThread(userId: string, projectId: string) {
  const rows = await db
    .select()
    .from(assistantThread)
    .where(
      and(
        eq(assistantThread.userId, userId),
        eq(assistantThread.projectId, projectId)
      )
    )
    .limit(1)

  return rows[0] ?? null
}

// Loads the newest messages in chronological order for the prompt.
export async function loadThreadMessages(
  threadId: string,
  limit = ASSISTANT_HISTORY_LIMIT
) {
  const rows = await db
    .select()
    .from(assistantMessage)
    .where(eq(assistantMessage.threadId, threadId))
    .orderBy(desc(assistantMessage.createdAt), desc(assistantMessage.id))
    .limit(limit)

  return rows.reverse()
}

// Stores one chat message.
export async function saveMessage({
  threadId,
  role,
  content,
}: {
  threadId: string
  role: "user" | "assistant"
  content: string
}) {
  return await db
    .insert(assistantMessage)
    .values({ id: randomUUID(), threadId, role, content })
    .returning()
}

// Deletes every message and proposal in the chat.
export async function clearThreadMessages(threadId: string) {
  await db
    .delete(assistantProposal)
    .where(eq(assistantProposal.threadId, threadId))
  await db
    .delete(assistantMessage)
    .where(eq(assistantMessage.threadId, threadId))
}
