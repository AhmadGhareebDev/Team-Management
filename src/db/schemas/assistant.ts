import { relations, sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "@/db/schemas/auth-schema";
import { project } from "@/db/schemas/project";

export const assistantMessageRoleEnum = pgEnum("assistant_message_role", [
  "user",
  "assistant",
]);

export const assistantProposalStatusEnum = pgEnum("assistant_proposal_status", [
  "pending",
  "applying",
  "applied",
  "rejected",
]);

export type AssistantProposalPayload = {
  summary?: string;
  create?: {
    ref?: string | null;
    title: string;
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string | null;
    assignees?: string[];
    dependsOn?: string[];
  }[];
  update?: {
    taskId: string;
    title?: string;
    description?: string | null;
    priority?: "low" | "medium" | "high" | "urgent";
    dueDate?: string | null;
    assignees?: string[];
  }[];
  delete?: { taskId: string }[];
  dependencies?: {
    add?: { taskId: string; dependsOnTaskId: string }[];
    remove?: { taskId: string; dependsOnTaskId: string }[];
  };
};

export const assistantThread = pgTable(
  "assistant_thread",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("assistant_thread_user_project_unique").on(
      table.userId,
      table.projectId
    ),
    index("assistant_thread_project_idx").on(table.projectId),
  ]
);

export const assistantMessage = pgTable(
  "assistant_message",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => assistantThread.id, { onDelete: "cascade" }),
    role: assistantMessageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assistant_message_thread_created_idx").on(
      table.threadId,
      table.createdAt
    ),
  ]
);

export const assistantProposal = pgTable(
  "assistant_proposal",
  {
    id: text("id").primaryKey(),
    threadId: text("thread_id")
      .notNull()
      .references(() => assistantThread.id, { onDelete: "cascade" }),
    messageId: text("message_id")
      .unique()
      .references(() => assistantMessage.id, { onDelete: "cascade" }),
    payload: jsonb("payload").$type<AssistantProposalPayload>().notNull(),
    status: assistantProposalStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("assistant_proposal_thread_status_idx").on(
      table.threadId,
      table.status
    ),
    uniqueIndex("assistant_proposal_thread_pending_unique")
      .on(table.threadId)
      .where(sql`${table.status} = 'pending'`),
  ]
);

export const assistantThreadRelations = relations(
  assistantThread,
  ({ one, many }) => ({
    user: one(user, {
      fields: [assistantThread.userId],
      references: [user.id],
    }),
    project: one(project, {
      fields: [assistantThread.projectId],
      references: [project.id],
    }),
    messages: many(assistantMessage),
    proposals: many(assistantProposal),
  })
);

export const assistantMessageRelations = relations(
  assistantMessage,
  ({ one }) => ({
    thread: one(assistantThread, {
      fields: [assistantMessage.threadId],
      references: [assistantThread.id],
    }),
    proposal: one(assistantProposal, {
      fields: [assistantMessage.id],
      references: [assistantProposal.messageId],
    }),
  })
);

export const assistantProposalRelations = relations(
  assistantProposal,
  ({ one }) => ({
    thread: one(assistantThread, {
      fields: [assistantProposal.threadId],
      references: [assistantThread.id],
    }),
    message: one(assistantMessage, {
      fields: [assistantProposal.messageId],
      references: [assistantMessage.id],
    }),
  })
);
