import { pgTable , text , timestamp , uniqueIndex , index } from "drizzle-orm/pg-core";
import { task } from "@/db/schemas/task";
import { user } from "@/db/schemas/auth-schema";
import { relations } from "drizzle-orm";



export const taskAssignees = pgTable("task_assignees", {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    taskId: text("task_id").notNull().references(() => task.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("task_assignees_uidx").on(table.taskId, table.userId),
  index("task_assignees_user_id_idx").on(table.userId),
]);


export const taskAssigneesRelations = relations(taskAssignees, ({ one }) => ({
    task: one(task, {
        fields: [taskAssignees.taskId],
        references: [task.id]
    }),
    user: one(user, {
        fields: [taskAssignees.userId],
        references: [user.id]
    }),
}));