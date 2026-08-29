import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"
import { config } from "dotenv"
import * as schema from "./schemas"
config({
    path: ".env"
})

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle({client:sql , schema})


