import { createInsertSchema , createSelectSchema } from "drizzle-zod";
import { user } from "@/db/schemas";
import { z } from "zod"


export const selectUserSchema = createSelectSchema(user);

export const insertLoginUserSchema = createInsertSchema(user , {
    email: (schema) => schema.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/ , "Invalid email format"),
}).extend({
    password: z.string().min(8 , "Password must be at least 8 characters long").max(100 , "Password must be at most 100 characters long")
}).pick({
    email: true,
    password: true
});

export const insertSignUpUserSchema = createInsertSchema(user , {
    name: (schema) => schema.min(2 , "Name must be at least 1 character long").max(100 , "Name must be at most 100 characters long"),
    username: (schema) => schema.min(3 , "Username must be at least 3 characters long").max(30 , "Username must be at most 30 characters long").regex(/^[a-zA-Z0-9_]+$/ , "Username can only contain letters, numbers, and underscores"),
    email: (schema) => schema.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/ , "Invalid email format"),
}).extend({
    password: z.string().min(8 , "Password must be at least 8 characters long").max(100 , "Password must be at most 100 characters long")
}).pick({
    name: true,
    username: true,
    email: true,
    password: true
});

export const emailValidator = z.object({
    email: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),
});
export const passwordValidator = z.object({
    password: z.string().min(8 , "Password must be at least 8 characters long").max(100 , "Password must be at most 100 characters long")
});

export const updateProfileSchema = insertSignUpUserSchema.pick({
    name: true,
    username: true,
});


export type SelectUserSchemaType = z.infer<typeof selectUserSchema>;
export type InsertLoginUserSchemaType = z.infer<typeof insertLoginUserSchema>;
export type InsertSignUpUserSchemaType = z.infer<typeof insertSignUpUserSchema>;
export type EmailValidatorSchemaType = z.infer<typeof emailValidator>;
export type PasswordValidatorSchemaType = z.infer<typeof passwordValidator>;
export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;