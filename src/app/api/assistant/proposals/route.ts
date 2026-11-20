import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import {
  applyAssistantProposal,
  dismissAssistantProposal,
} from "@/lib/assistant/apply"

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

// Applies or dismisses one pending assistant proposal.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await readBody(request)
  const proposalId = body?.proposalId
  const action = body?.action

  if (
    typeof proposalId !== "string" ||
    (action !== "apply" && action !== "dismiss")
  ) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  const result =
    action === "apply"
      ? await applyAssistantProposal({ userId: session.user.id, proposalId })
      : await dismissAssistantProposal({ userId: session.user.id, proposalId })

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 })
  }

  return Response.json(result)
}
