import { db } from "@/db"
import { user } from "@/db/schemas"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

export async function GET() {
  const url = process.env.DATABASE_URL ?? ""
  let host = "MISSING"
  try { host = new URL(url).host } catch {}

  const email = "owner@example.com"
  const rows = await db
    .select({
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    })
    .from(user)
    .where(eq(user.email, email))
    .limit(1)

  const result = {
    dbHost: host,
    queriedEmail: email,
    row: rows[0] ?? null,
  }

  console.log("[AUTH DEBUG] /api/debug/auth result:", result)
  return Response.json(result)
}
