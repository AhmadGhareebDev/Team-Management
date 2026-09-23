import { z } from "zod"
import { workspace } from "@/db/schemas"
import { createInsertSchema , createSelectSchema } from "drizzle-zod"

export const selectWorkspaceSchema = createSelectSchema(workspace);




export const insertWorkspaceSchema = createInsertSchema(workspace , {
    name: (schema) => schema.min(2 , "Name must be at least 2 characters long").max(255 , "Name must be at most 255 characters long"),
}).pick({
    name: true,
})

export type SelectWorkspaceSchemaType = z.infer<typeof selectWorkspaceSchema>;
export type InsertWorkspaceSchemaType = z.infer<typeof insertWorkspaceSchema>;