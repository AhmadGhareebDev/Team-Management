import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { task, user } from "@/db/schemas";

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
});

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