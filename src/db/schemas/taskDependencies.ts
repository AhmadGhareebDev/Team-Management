import { pgTable , text , timestamp , index } from "drizzle-orm/pg-core";
import { task } from "@/db/schemas/task";
import { relations } from "drizzle-orm";


export const taskDependencies = pgTable("task_dependencies", {
    id: text("id").primaryKey(),
    taskId: text("task_id").notNull(),
    dependsOnId: text("depends_on_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("task_dependencies_task_id_idx").on(table.taskId),
  index("task_dependencies_depends_on_id_idx").on(table.dependsOnId),
]);

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