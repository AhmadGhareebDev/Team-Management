import { NextResponse } from "next/server"
import { runNotificationsScan } from "@/lib/notifications"

/**
 * Scheduled sweep for time-based notifications: overdue, due within 24h, and
 * blocked-by-an-overdue-dependency.
 *
 * This used to run inside the dashboard layout, which meant the alerts only
 * fired while somebody had the app open and every page load was a write. Running
 * it here means a quiet workspace still gets its notifications.
 *
 * Guarded by a bearer token so it cannot be triggered from the public internet.
 * Configure it as:
 *   CRON_SECRET=<random string>
 * and either set `schedule` in vercel.json (Vercel sends the header for you) or
 * call it externally:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/notifications
 */
// No `dynamic = "force-dynamic"` here: this project has cacheComponents on,
// which rejects that segment config. Reading request.headers already makes this
// route dynamic.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    )
  }

  const authorization = request.headers.get("authorization")

  if (authorization !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = Date.now()

  try {
    await runNotificationsScan()
  } catch (error) {
    console.error("Error running notifications scan:", error)
    return NextResponse.json({ error: "Scan failed" }, { status: 500 })
  }

  // Notification rows are written inside after() callbacks, so a successful run
  // reports that the scan completed rather than a row count.
  return NextResponse.json({ ok: true, durationMs: Date.now() - startedAt })
}