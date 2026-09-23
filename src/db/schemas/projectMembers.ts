import { relations } from "drizzle-orm";
import { pgTable, text ,timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { user } from "@/db/schemas/auth-schema"
import { project } from "@/db/schemas/project"


export const projectMembers = pgTable("project_members", {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull().references(() => project.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("project_members_uidx").on(table.projectId, table.userId),
  index("project_members_user_id_idx").on(table.userId),
])


export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
    project: one(project, {
        fields: [projectMembers.projectId],
        references: [project.id]
    }),
    user: one(user, {
        fields: [projectMembers.userId],
        references: [user.id]
    })
}));