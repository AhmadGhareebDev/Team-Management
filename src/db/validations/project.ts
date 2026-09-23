import { z } from "zod"
import { project } from "@/db/schemas"
import { createInsertSchema } from "drizzle-zod"

export const insertProjectSchema = createInsertSchema(project, {
    name: (schema) => schema.min(2, "Name must be at least 2 characters long").max(255, "Name must be at most 255 characters long"),
    description: (schema) => schema.optional(),
}).pick({
    name: true,
    description: true,
})

export type InsertProjectSchemaType = z.infer<typeof insertProjectSchema>;