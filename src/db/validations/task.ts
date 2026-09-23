import { z } from "zod"
import { task } from "@/db/schemas"
import { createInsertSchema } from "drizzle-zod"

export const insertTaskSchema = createInsertSchema(task, {
    title: (schema) =>
        schema
            .min(1, "Title is required")
            .max(255, "Title must be at most 255 characters"),
    description: (schema) => schema.optional(),
}).pick({
    title: true,
    description: true,
})

export type InsertTaskSchemaType = z.infer<typeof insertTaskSchema>

export const taskPositionSchema = z.object({
    x: z.number(),
    y: z.number(),
})

export type TaskPositionSchemaType = z.infer<typeof taskPositionSchema>

export const taskDependencySchema = z.object({
    taskId: z.string().min(1),
    dependsOnId: z.string().min(1),
})

export type TaskDependencySchemaType = z.infer<typeof taskDependencySchema>

export const taskStatusSchema = z.object({
    status: z.enum(["todo", "in_progress", "in_review", "done", "blocked"]),
})

export type TaskStatusSchemaType = z.infer<typeof taskStatusSchema>

export const updateTaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(255, "Title must be at most 255 characters")
        .optional(),
    description: z
        .string()
        .trim()
        .max(2000, "Description is too long")
        .nullable()
        .optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    dueDate: z
        .union([z.string(), z.date()])
        .transform((value) =>
            typeof value === "string" ? (value === "" ? null : new Date(value)) : value
        )
        .nullable()
        .optional(),
})

export type UpdateTaskSchemaType = z.infer<typeof updateTaskSchema>

export const taskAssigneesSchema = z.object({
    userIds: z.array(z.string().min(1)),
})

export type TaskAssigneesSchemaType = z.infer<typeof taskAssigneesSchema>

export const insertSubtaskSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Title is required")
        .max(200, "Title must be at most 200 characters"),
})

export type InsertSubtaskSchemaType = z.infer<typeof insertSubtaskSchema>