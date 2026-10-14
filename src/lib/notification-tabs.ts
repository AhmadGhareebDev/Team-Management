import type { NotificationPayloadType } from "@/lib/ably-channel";

export const NOTIFICATION_TAB_TYPES: Record<
  "invitations" | "tasks" | "members",
  readonly NotificationPayloadType[]
> = {
  invitations: ["workspace_invitation"],
  tasks: [
    "task_assigned",
    "task_unblocked",
    "dependency_overdue",
    "dependency_resolved",
    "deadline_approaching",
    "task_reassigned",
    "task_overdue",
  ],
  members: ["member_removed", "project_member_added"],
};

export type NotificationTab = keyof typeof NOTIFICATION_TAB_TYPES;