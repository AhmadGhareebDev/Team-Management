import { pgTable, text, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { user } from "@/db/schemas"
import { relations } from "drizzle-orm";
export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_unblocked",
  "dependency_overdue",
  "deadline_approaching",
  "task_reassigned",
  "member_removed",
  "task_overdue",
  "workspace_invitation",
]);


export const notification = pgTable("notification", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  body: text("body").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(), 
}
)


export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, {
    fields: [notification.userId],
    references: [user.id],
  }),
}));