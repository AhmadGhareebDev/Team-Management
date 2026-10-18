import { sql } from "drizzle-orm"
import { db } from "./index"

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set")
  }

  console.log("")
  console.log("Dropping every table in this database.")
  console.log("")

  // The `drizzle` schema holds the migration journal. Dropping only `public`
  // would leave the journal behind, and `drizzle-kit migrate` would then
  // conclude that everything is already applied and recreate nothing.
  await db.execute(sql`drop schema if exists drizzle cascade`)
  await db.execute(sql`drop schema if exists public cascade`)
  await db.execute(sql`create schema public`)

  console.log("Database is empty.")
  console.log("")
  console.log("Recreate it with:")
  console.log("  npx drizzle-kit migrate")
  console.log("  npm run demo:seed")
  console.log("")

  process.exit(0)
}

main().catch((error) => {
  console.error("Reset failed:", error)
  process.exit(1)
})
