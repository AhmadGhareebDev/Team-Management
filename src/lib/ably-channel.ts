export const notificationChannel = (userId: string) => `notifications:${userId}`;

export const projectChannel = (projectId: string) => `project:${projectId}`;

export const workspaceChannel = (workspaceId: string) => `workspace:${workspaceId}`;

export type NotificationPayloadType =
  | "workspace_invitation"
  | "task_assigned"
  | "task_unblocked"
  | "dependency_overdue"
  | "dependency_resolved"
  | "deadline_approaching"
  | "task_reassigned"
  | "member_removed"
  | "task_overdue"
  | "project_member_added";

export type NotificationInvitationStatus = "pending" | "accepted" | "declined";

export type NotificationPayload = {
  id: string;
  userId: string;
  actorId: string | null;
  workspaceId: string | null;
  workspaceInvitationId: string | null;
  projectId: string | null;
  taskId: string | null;
  type: NotificationPayloadType;
  body: string;
  isRead: boolean;
  createdAt: string;
  actor: { id: string; name: string; avatar_url: string | null } | null;
  workspace: { id: string; name: string } | null;
  project: { id: string; workspaceId: string } | null;
  workspaceInvitation: { id: string; status: NotificationInvitationStatus } | null;
};
export type CanvasTaskPayload = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  positionX: number;
  positionY: number;
  updatedAt: string;
  assignees: {
    user: {
      id: string;
      name: string;
      username: string | null;
      avatar_url: string | null;
    };
  }[];
  blockedBy: {
    id: string;
    dependsOn: {
      id: string;
      title: string;
      status: string;
      dueDate: string | null;
    };
  }[];
};

export type CanvasEvent =
  | { kind: "upsert"; tasks: CanvasTaskPayload[] }
  | { kind: "delete"; taskIds: string[] };

export type WorkspaceInvalidation = { kind: "invalidate" };
