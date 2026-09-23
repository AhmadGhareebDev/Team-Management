import { pgTable, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { task } from "@/db/schemas/task";
import { user } from "@/db/schemas/auth-schema";

export const subtask = pgTable("subtask", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => user.id),
  title: text("title").notNull(),
  isDone: boolean("is_done").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index("subtask_task_id_idx").on(table.taskId),
]);

export const subtaskRelations = relations(subtask, ({ one }) => ({
  task: one(task, {
    fields: [subtask.taskId],
    references: [task.id],
  }),
  createdBy: one(user, {
    fields: [subtask.createdBy],
    references: [user.id],
  }),
}));