import { pgTable, text, timestamp, pgEnum , uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace } from "@/db/schemas/workspace";
import { user } from "@/db/schemas/auth-schema";


export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "member"]);

export const workspaceMembers = pgTable("workspace_members", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: workspaceRoleEnum("role").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("workspace_members_uidx").on(table.workspaceId, table.userId),
]);



export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspace, {
    fields: [workspaceMembers.workspaceId],
    references: [workspace.id],
  }),
  user: one(user, {
    fields: [workspaceMembers.userId],
    references: [user.id],
  }),
}));