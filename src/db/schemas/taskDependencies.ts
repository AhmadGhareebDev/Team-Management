import { pgTable , text , timestamp } from "drizzle-orm/pg-core";
import { task } from "@/db/schemas/task";
import { relations } from "drizzle-orm";


export const taskDependencies = pgTable("task_dependencies", {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    dependsOnId: text("depends_on_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const taskDependenciesRelations = relations(taskDependencies, ({ one }) => ({
  task: one(task, {
    fields: [taskDependencies.taskId],
    references: [task.id],
    relationName: "blocked_task",
  }),
  dependsOn: one(task, {
    fields: [taskDependencies.dependsOnId],
    references: [task.id],
    relationName: "blocking_task",
  }),
}));