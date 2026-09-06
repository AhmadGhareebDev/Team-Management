import { z } from "zod"
import { project } from "@/db/schemas"
import { createInsertSchema } from "drizzle-zod"

export const insertProjectSchema = createInsertSchema(project, {
    name: (schema) => schema.min(2, "Name must be at least 2 characters long").max(255, "Name must be at most 255 characters long"),
    description: (schema) => schema.optional(),
    cover_url: (schema) => schema.optional(),
    cover_file_id: (schema) => schema.optional(),
}).pick({
    name: true,
    description: true,
    cover_url: true,
    cover_file_id: true,
})

export type InsertProjectSchemaType = z.infer<typeof insertProjectSchema>;