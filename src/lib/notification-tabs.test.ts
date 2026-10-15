import { describe, expect, it } from "vitest"
import {
  NOTIFICATION_TAB_TYPES,
  type NotificationTab,
} from "@/lib/notification-tabs"
import type { NotificationPayloadType } from "@/lib/ably-channel"

/**
 * These tabs are how the dropdown both filters rows in SQL and decides which
 * unread badge to bump when an Ably message arrives. A type that lands in the
 * wrong tab, or in none of them, is either invisible in the dropdown or bumps
 * every badge on arrival, so the mapping is worth pinning.
 */

/** Every type the realtime payload union can carry. */
const ALL_TYPES: NotificationPayloadType[] = [
  "workspace_invitation",
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "dependency_resolved",
  "deadline_approaching",
  "task_reassigned",
  "member_removed",
  "task_overdue",
  "project_member_added",
]

const allMapped = Object.values(NOTIFICATION_TAB_TYPES).flat()

describe("NOTIFICATION_TAB_TYPES", () => {
  it("assigns every notification type to exactly one tab", () => {
    const seen = allMapped.filter((type) => ALL_TYPES.includes(type))

    expect([...new Set(seen)].sort()).toEqual([...ALL_TYPES].sort())
  })

  it("never lists a type in two tabs", () => {
    expect(new Set(allMapped).size).toBe(allMapped.length)
  })

  it("has no unknown types, which would mean a typo in the map", () => {
    for (const type of allMapped) {
      expect(ALL_TYPES).toContain(type)
    }
  })

  it("keeps workspace invitations to the invitations tab", () => {
    expect(NOTIFICATION_TAB_TYPES.invitations).toEqual(["workspace_invitation"])
  })

  it("routes the task lifecycle notifications to the tasks tab", () => {
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("task_assigned")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("task_unblocked")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("dependency_overdue")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("dependency_resolved")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("deadline_approaching")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("task_reassigned")
    expect(NOTIFICATION_TAB_TYPES.tasks).toContain("task_overdue")
  })

  it("routes membership changes to the members tab", () => {
    expect(NOTIFICATION_TAB_TYPES.members).toContain("member_removed")
    expect(NOTIFICATION_TAB_TYPES.members).toContain("project_member_added")
  })

  it("exposes exactly the three tabs the dropdown renders", () => {
    expect(Object.keys(NOTIFICATION_TAB_TYPES).sort()).toEqual([
      "invitations",
      "members",
      "tasks",
    ])
  })

  it("resolves the tab a payload type belongs to", () => {
    // Mirrors the lookup NotificationsProvider does when a message arrives.
    const tabOf = (type: NotificationPayloadType): NotificationTab | undefined =>
      (Object.keys(NOTIFICATION_TAB_TYPES) as NotificationTab[]).find((tab) =>
        NOTIFICATION_TAB_TYPES[tab].includes(type)
      )

    expect(tabOf("workspace_invitation")).toBe("invitations")
    expect(tabOf("task_overdue")).toBe("tasks")
    expect(tabOf("member_removed")).toBe("members")
  })
})