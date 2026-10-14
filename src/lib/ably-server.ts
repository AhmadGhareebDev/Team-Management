import Ably from "ably"
import { after } from "next/server"
import { inArray } from "drizzle-orm"
import { db } from "@/db"
import { task } from "@/db/schemas"
import {
  notificationChannel,
  projectChannel,
  workspaceChannel,
  type CanvasEvent,
  type CanvasTaskPayload,
  type NotificationPayload,
  type WorkspaceInvalidation,
} from "@/lib/ably-channel"

let client: Ably.Rest | null = null

function getClient() {
  if (!process.env.ABLY_API_KEY) return null
  if (!client) {
    client = new Ably.Rest({ key: process.env.ABLY_API_KEY })
  }
  return client
}

export async function publishNotification(
  userId: string,
  payload: NotificationPayload
) {
  const ably = getClient()
  if (!ably) return

  try {
    await ably.channels
      .get(notificationChannel(userId))
      .publish("new", payload)
  } catch (error) {
    console.error("Ably publish failed:", error)
  }
}
export async function publishCanvasEvent(projectId: string, event: CanvasEvent) {
  const ably = getClient();
  if (!ably) return;

  try {
    await ably.channels.get(projectChannel(projectId)).publish("canvas", event);
  } catch (error) {
    console.error("Ably canvas publish failed:", error);
  }
}

/**
 * Re-reads the given tasks with the same relations `getProjectTasks` returns.
 * `blockedBy` matters: the client derives canvas edges from it, so a payload
 * without it would corrupt the graph. Position values are included so the row
 * is always complete and self-consistent, even though position changes are
 * never broadcast.
 */
export async function buildCanvasTaskPayloads(
  taskIds: string[]
): Promise<CanvasTaskPayload[]> {
  if (taskIds.length === 0) return [];

  const rows = await db.query.task.findMany({
    where: inArray(task.id, taskIds),
    columns: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      positionX: true,
      positionY: true,
      updatedAt: true,
    },
    with: {
      assignees: {
        columns: {},
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              username: true,
              avatar_url: true,
            }
          }
        }
      },
      blockedBy: {
        columns: { id: true },
        with: {
          dependsOn: {
            columns: { id: true, title: true, status: true, dueDate: true }
          }
        }
      }
    }
  });

  return rows.map((row) => ({
    ...row,
    status: row.status as string,
    priority: row.priority as string,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
    blockedBy: row.blockedBy.map((entry) => ({
      id: entry.id,
      dependsOn: {
        id: entry.dependsOn.id,
        title: entry.dependsOn.title,
        status: entry.dependsOn.status as string,
        dueDate: entry.dependsOn.dueDate
          ? entry.dependsOn.dueDate.toISOString()
          : null,
      },
    })),
  }));
}

/**
 * Both helpers run inside `after()` so the publish never sits on the response
 * path of the action that triggered it.
 */
export function publishCanvasUpserts(projectId: string, taskIds: string[]) {
  if (taskIds.length === 0) return;

  after(async () => {
    const tasks = await buildCanvasTaskPayloads(taskIds);
    if (tasks.length === 0) return;
    await publishCanvasEvent(projectId, { kind: "upsert", tasks });
  });
}

export function publishCanvasDeletes(projectId: string, taskIds: string[]) {
  if (taskIds.length === 0) return;

  after(async () => {
    await publishCanvasEvent(projectId, { kind: "delete", taskIds });
  });
}

/**
 * The workspace page renders server components, so rather than pushing rows we
 * push a nudge and let each viewer re-read the database. That keeps deletes,
 * cascades and permission changes correct without any client-side merging.
 *
 * Debounced on the receiving side, because a burst of edits would otherwise
 * trigger one full page render per message.
 */
export function publishWorkspaceInvalidation(workspaceId: string) {
  if (!workspaceId) return;

  after(async () => {
    const ably = getClient();
    if (!ably) return;

    try {
      await ably.channels
        .get(workspaceChannel(workspaceId))
        .publish("workspace", { kind: "invalidate" } satisfies WorkspaceInvalidation);
    } catch (error) {
      console.error("Ably workspace publish failed:", error);
    }
  });
}
