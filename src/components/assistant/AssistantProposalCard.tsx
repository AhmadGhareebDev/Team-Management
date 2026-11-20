"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export type AssistantProposalStatus =
  | "pending"
  | "applying"
  | "applied"
  | "rejected"

export type AssistantProposalView = {
  id: string
  status: AssistantProposalStatus
  payload: {
    summary?: string
    create?: { title: string }[]
    update?: { taskId: string }[]
    delete?: { taskId: string }[]
    dependencies?: {
      add?: { taskId: string; dependsOnTaskId: string }[]
      remove?: { taskId: string; dependsOnTaskId: string }[]
    }
  }
}

const MAX_CREATE_PREVIEW = 6

function statusLabel(status: AssistantProposalStatus) {
  if (status === "pending") return "Pending"
  if (status === "applying") return "Applying"
  if (status === "applied") return "Applied"
  return "Dismissed"
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: unknown }
    if (typeof data.error === "string") return data.error
  } catch {}

  return "Something went wrong. Please try again."
}

export function AssistantProposalCard({
  proposal,
  onStatusChange,
}: {
  proposal: AssistantProposalView
  onStatusChange?: (id: string, status: AssistantProposalStatus) => void
}) {
  const router = useRouter()
  const status = proposal.status
  const [busy, setBusy] = useState<"apply" | "dismiss" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedCreate, setExpandedCreate] = useState(false)
  const { payload } = proposal
  const creates = payload.create?.length ?? 0
  const updates = payload.update?.length ?? 0
  const deletes = payload.delete?.length ?? 0
  const dependencies =
    (payload.dependencies?.add?.length ?? 0) +
    (payload.dependencies?.remove?.length ?? 0)

  async function handleAction(action: "apply" | "dismiss") {
    if (busy || status !== "pending") return
    setBusy(action)
    setError(null)

    try {
      const response = await fetch("/api/assistant/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.id, action }),
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const nextStatus = action === "apply" ? "applied" : "rejected"
      onStatusChange?.(proposal.id, nextStatus)
      toast.add({
        type: "success",
        description:
          action === "apply"
            ? "Proposal applied to the board."
            : "Proposal dismissed.",
      })

      if (action === "apply") router.refresh()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not update the proposal."
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <Card
      size="sm"
      className="mt-2 gap-2 border-border bg-card/70 py-2 shadow-none ring-0 [--card-spacing:--spacing(3)]"
    >
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <ClipboardList
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 truncate text-[11px] font-semibold tracking-wider text-foreground uppercase">
            Proposed changes
          </p>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              (status === "pending" || status === "applying") &&
                "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              status === "applied" &&
                "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              status === "rejected" && "text-muted-foreground"
            )}
          >
            {statusLabel(status)}
          </Badge>
        </div>

        {payload.summary && (
          <p className="text-xs leading-relaxed text-foreground [overflow-wrap:anywhere]">
            {payload.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {creates > 0 && <Badge variant="secondary">Create {creates}</Badge>}
          {updates > 0 && <Badge variant="secondary">Update {updates}</Badge>}
          {deletes > 0 && <Badge variant="secondary">Delete {deletes}</Badge>}
          {dependencies > 0 && (
            <Badge variant="secondary">Dependencies {dependencies}</Badge>
          )}
        </div>

        {payload.create && payload.create.length > 0 && (
          <>
            <ul
              className={cn(
                "space-y-1 overflow-y-auto border-t border-border/60 pt-2 text-xs text-muted-foreground",
                expandedCreate ? "max-h-96" : "max-h-36"
              )}
            >
              {payload.create
                .slice(0, expandedCreate ? undefined : MAX_CREATE_PREVIEW)
                .map((item, index) => (
                  <li key={index} className="flex min-w-0 gap-2">
                    <span className="shrink-0 text-muted-foreground/70">{index + 1}.</span>
                    <span className="min-w-0 [overflow-wrap:anywhere]">{item.title}</span>
                  </li>
                ))}
            </ul>
            {payload.create.length > MAX_CREATE_PREVIEW && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => setExpandedCreate((current) => !current)}
              >
                {expandedCreate ? "Show less" : "Show all"}
              </Button>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="text-xs leading-relaxed text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2">
          <p className="min-w-0 text-[10px] leading-relaxed tracking-wide text-muted-foreground">
            {status === "pending"
              ? "Nothing has been applied yet."
              : status === "applying"
                ? "Applying changes to the board."
                : status === "applied"
                  ? "Applied to the board."
                  : "Dismissed. Nothing was changed."}
          </p>

          {status === "pending" && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                size="xs"
                variant="ghost"
                disabled={busy !== null}
                onClick={() => handleAction("dismiss")}
              >
                {busy === "dismiss" && <Loader2 className="animate-spin" />}
                Dismiss
              </Button>
              <Button
                type="button"
                size="xs"
                disabled={busy !== null}
                onClick={() => handleAction("apply")}
              >
                {busy === "apply" && <Loader2 className="animate-spin" />}
                Apply
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
