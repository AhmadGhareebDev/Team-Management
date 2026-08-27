import { pgTable, text, timestamp, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { workspace, user } from "@/db/schemas";

export const invitationStatusEnum = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "declined",
]);

export const workspaceInvitation = pgTable("workspace_invitation", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspace.id, { onDelete: "cascade" }),
  inviterId: text("inviter_id").notNull().references(() => user.id),
  inviteeId: text("invitee_id").notNull().references(() => user.id),
  status: invitationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  uniqueIndex("workspace_invitation_uidx").on(table.workspaceId, table.inviteeId),
]);

export const workspaceInvitationRelations = relations(workspaceInvitation, ({ one }) => ({
    workspace: one(workspace, {
        fields: [workspaceInvitation.workspaceId],
        references: [workspace.id],
  }),
    inviter: one(user, {
    fields: [workspaceInvitation.inviterId],
    references: [user.id],
    relationName: "inviter",
}),
    invitee: one(user, {
    fields: [workspaceInvitation.inviteeId],
    references: [user.id],
    relationName: "invitee",
    }),
  
}));