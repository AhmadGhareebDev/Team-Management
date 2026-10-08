import { pgTable, text, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "@/db/schemas/auth-schema";
import { workspace } from "@/db/schemas/workspace";
import { project } from "@/db/schemas/project";

export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_status_changed",
  "task_updated",
  "task_assigned",
  "task_unassigned",
  "task_deleted",
  "dependency_added",
  "dependency_removed",
  "subtask_added",
  "subtask_completed",
  "subtask_deleted",
  "project_created",
  "project_updated",
  "project_deleted",
  "member_added",
  "member_removed",
  "member_role_changed",
]);

export type ActivityMetadata = {
  title?: string;
  from?: string;
  to?: string;
  name?: string;
};

export const activity = pgTable(
  "activity",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").$type<ActivityMetadata>().default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("activity_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("activity_project_created_idx").on(table.projectId, table.createdAt),
    index("activity_actor_created_idx").on(table.actorId, table.createdAt),
  ]
);

export const activityRelations = relations(activity, ({ one }) => ({
  actor: one(user, {
    fields: [activity.actorId],
    references: [user.id],
  }),
  workspace: one(workspace, {
    fields: [activity.workspaceId],
    references: [workspace.id],
  }),
  project: one(project, {
    fields: [activity.projectId],
    references: [project.id],
  }),
}));
