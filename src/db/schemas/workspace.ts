import { pgTable, text, varchar ,timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { project , workspaceInvitation, workspaceMembers } from "@/db/schemas";

export const workspace = pgTable("workspace", {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    cover_url: text("cover_url"),
    cover_file_id: text("cover_file_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
        .$onUpdate(() => new Date())
        .notNull(),
})

export const workspaceRelations = relations(workspace, ({ many }) => ({
    projects: many(project),
    members: many(workspaceMembers),
    invitations: many(workspaceInvitation),
}));