import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, pgEnum , real, index } from "drizzle-orm/pg-core";
import { user } from "@/db/schemas/auth-schema";
import { project } from "@/db/schemas/project";
import { taskAssignees } from "@/db/schemas/taskAssignees";
import { taskDependencies } from "@/db/schemas/taskDependencies";
import { subtask } from "@/db/schemas/subtasks";


export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const task = pgTable("task", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  positionX: real("position_x").notNull().default(0),
  positionY: real("position_y").notNull().default(0),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("task_project_id_idx").on(table.projectId),
  index("task_status_idx").on(table.status),
  index("task_due_date_idx").on(table.dueDate),
]);

export const taskRelations = relations(task, ({ one, many }) => ({
  project: one(project, {
    fields: [task.projectId],
    references: [project.id],
  }),
  createdBy: one(user, {
    fields: [task.createdBy],
    references: [user.id],
  }),
  assignees: many(taskAssignees),
  blockedBy: many(taskDependencies, { relationName: "blocked_task" }),
  blocking: many(taskDependencies, { relationName: "blocking_task" }),
  subtasks: many(subtask),
}));