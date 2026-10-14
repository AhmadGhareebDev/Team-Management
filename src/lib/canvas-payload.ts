import type { CanvasTaskPayload } from "@/lib/ably-channel"
import type { ProjectTask } from "@/db/queries/task"

/**
 * Revives the JSON that crossed Ably into the shape the canvas already renders.
 * Dates arrive as ISO strings and `formatRelativeTime` / `isOverdue` both call
 * `.getTime()`, so this has to happen before the payload touches a component.
 */
export function toProjectTask(payload: CanvasTaskPayload): ProjectTask {
  return {
    id: payload.id,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    positionX: payload.positionX,
    positionY: payload.positionY,
    updatedAt: new Date(payload.updatedAt),
    assignees: payload.assignees,
    blockedBy: payload.blockedBy.map((entry) => ({
      id: entry.id,
      dependsOn: {
        id: entry.dependsOn.id,
        title: entry.dependsOn.title,
        status: entry.dependsOn.status,
        dueDate: entry.dependsOn.dueDate
          ? new Date(entry.dependsOn.dueDate)
          : null,
      },
    })),
  } as unknown as ProjectTask
}