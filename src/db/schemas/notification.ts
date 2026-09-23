import { pgTable, text, timestamp, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "@/db/schemas/auth-schema"
import { workspace } from "@/db/schemas/workspace"
import { workspaceInvitation } from "@/db/schemas/workspaceInvitation"
import { project } from "@/db/schemas/project"
import { task } from "@/db/schemas/task"
import { relations } from "drizzle-orm";
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "dependency_resolved",
  "deadline_approaching",
  "task_reassigned",
  "member_removed",
  "task_overdue",
  "workspace_invitation",
]);


export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  actorId: text("actor_id").references(() => user.id),
  workspaceId: text("workspace_id").references(() => workspace.id),
  workspaceInvitationId: text("workspace_invitation_id").references(() => workspaceInvitation.id),
  projectId: text("project_id").references(() => project.id, { onDelete: "cascade" }),
  taskId: text("task_id").references(() => task.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), 
}, (table) => [
  index("notification_user_created_idx").on(table.userId, table.createdAt),
  index("notification_workspace_invitation_id_idx").on(table.workspaceInvitationId),
  index("notification_project_id_idx").on(table.projectId),
  index("notification_task_id_idx").on(table.taskId),
]
)


export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
  actor: one(user, {
    fields: [notification.actorId],
    references: [user.id],
    relationName: "actor",
  }),
  workspace: one(workspace, {
    fields: [notification.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [notification.projectId],
    references: [project.id],
  }),
  task: one(task, {
    fields: [notification.taskId],
    references: [task.id],
  }),
}));