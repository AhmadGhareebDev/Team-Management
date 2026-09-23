import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "@/db/schemas/workspace";
import { projectMembers } from "@/db/schemas/projectMembers";
export const project = pgTable("project", {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    cover_url: text("cover_url"),
    cover_file_id: text("cover_file_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .$onUpdate(() => new Date())
        .notNull(),
}, (table) => [
  index("project_workspace_id_idx").on(table.workspaceId),
])


export const projectRelations = relations(project, ({ one , many }) => ({
    workspace: one(workspace, {
        fields: [project.workspaceId],
        references: [workspace.id]
    }),
    members: many(projectMembers)
}));
