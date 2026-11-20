import { headers } from "next/headers"
import Groq from "groq-sdk"
import { auth } from "@/lib/auth"
import { getUserProjectAccess } from "@/db/queries/project"
import { getAssistantAccess } from "@/lib/assistant/access"
import { buildSystemPrompt } from "@/lib/assistant/context"
import {
  clearThreadMessages,
  findOrCreateThread,
  findThread,
  loadThreadMessages,
  saveMessage,
} from "@/lib/assistant/threads"
import {
  assistantProposalTool,
  createPendingProposal,
  loadProposalsForMessages,
  validateProposalArguments,
} from "@/lib/assistant/proposals"

const ASSISTANT_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b"
const MAX_MESSAGE_LENGTH = 4000

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user ?? null
}

async function canViewProject(projectId: string, userId: string) {
  const access = await getUserProjectAccess(projectId, userId)
  return getAssistantAccess(access).canView
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

// Returns the current user's chat history for a project.
export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projectId = new URL(request.url).searchParams.get("projectId")
  if (!projectId) {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  if (!(await canViewProject(projectId, user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const thread = await findThread(user.id, projectId)
  if (!thread) {
    return Response.json({ messages: [] })
  }

  const messages = await loadThreadMessages(thread.id)
  const proposals = await loadProposalsForMessages(messages.map((item) => item.id))
  const proposalsByMessageId = new Map(
    proposals.map((item) => [item.messageId, item])
  )

  return Response.json({
    messages: messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      proposal: proposalsByMessageId.get(message.id) ?? null,
    })),
  })
}

// Handles one chat turn and streams the assistant reply.
export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { error: "Assistant is not configured" },
      { status: 503 }
    )
  }

  const body = await readBody(request)
  const projectId = body?.projectId
  const message = body?.message

  if (typeof projectId !== "string" || typeof message !== "string") {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  const content = message.trim()
  if (!content || content.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: "Invalid message" }, { status: 400 })
  }

  const access = await getUserProjectAccess(projectId, user.id)
  const assistantAccess = getAssistantAccess(access)

  if (!assistantAccess.canView) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const systemPrompt = await buildSystemPrompt(
    projectId,
    user,
    ASSISTANT_MODEL,
    assistantAccess
  )
  if (!systemPrompt) {
    return Response.json({ error: "Project not found" }, { status: 404 })
  }

  const thread = await findOrCreateThread(user.id, projectId)
  const history = await loadThreadMessages(thread.id)

  await saveMessage({ threadId: thread.id, role: "user", content })

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((item) => ({
      role: item.role as "user" | "assistant",
      content: item.content,
    })),
    { role: "user", content },
  ]

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

  let completion
  try {
    completion = await groq.chat.completions.create({
      model: ASSISTANT_MODEL,
      messages,
      stream: true,
      ...(assistantAccess.canManage
        ? { tools: [assistantProposalTool], tool_choice: "auto" as const }
        : {}),
    })
  } catch (error) {
    console.error("Assistant request failed:", error)
    return Response.json({ error: "Assistant request failed" }, { status: 502 })
  }

  const encoder = new TextEncoder()
  let fullText = ""
  const toolCalls = new Map<
    number,
    { id?: string; name?: string; arguments: string }
  >()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantSaved = false

      async function saveAssistant(content: string) {
        await saveMessage({
          threadId: thread.id,
          role: "assistant",
          content,
        })
        assistantSaved = true
      }

      try {
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta
          const text = delta?.content

          if (text) {
            fullText += text
            controller.enqueue(encoder.encode(text))
          }

          for (const toolCall of delta?.tool_calls ?? []) {
            const index = typeof toolCall.index === "number" ? toolCall.index : 0
            const current = toolCalls.get(index) ?? { arguments: "" }
            if (toolCall.id) current.id = toolCall.id

            const functionCall = toolCall.function
            if (functionCall?.name) {
              current.name = `${current.name ?? ""}${functionCall.name}`
            }
            if (functionCall?.arguments) {
              current.arguments += functionCall.arguments
            }

            toolCalls.set(index, current)
          }
        }

        const calls = [...toolCalls.values()].filter((item) => item.name)

        if (calls.length > 0) {
          if (!assistantAccess.canManage) {
            const notice =
              "Board-change proposals are available only to project owners and admins."
            const content = fullText.trim() ? `${fullText.trim()}\n\n${notice}` : notice
            await saveAssistant(content)
            if (!fullText.trim()) controller.enqueue(encoder.encode(content))
          } else if (calls.length !== 1 || calls[0].name !== "propose_board_changes") {
            const notice = "Please ask for one board-change proposal at a time."
            const content = fullText.trim() ? `${fullText.trim()}\n\n${notice}` : notice
            await saveAssistant(content)
            if (!fullText.trim()) controller.enqueue(encoder.encode(content))
          } else {
            const validation = await validateProposalArguments(
              projectId,
              calls[0].arguments
            )

            if (validation.ok) {
              const content =
                fullText.trim() ||
                `I prepared a proposal: ${validation.payload.summary ?? "board changes"}. Review it in the chat. Nothing has been applied yet.`
              const [savedMessage] = await saveMessage({
                threadId: thread.id,
                role: "assistant",
                content,
              })
              assistantSaved = true

              if (!savedMessage?.id) {
                throw new Error("Could not store the assistant message.")
              }

              await createPendingProposal({
                threadId: thread.id,
                messageId: savedMessage.id,
                payload: validation.payload,
              })

              if (!fullText.trim()) {
                controller.enqueue(encoder.encode(content))
              }
            } else {
              const notice = `I couldn't prepare that proposal: ${validation.error}`
              const content = fullText.trim()
                ? `${fullText.trim()}\n\n${notice}`
                : notice
              await saveAssistant(content)
              if (!fullText.trim()) controller.enqueue(encoder.encode(content))
            }
          }
        } else if (fullText.trim()) {
          await saveAssistant(fullText.trim())
        }
      } catch (error) {
        console.error("Assistant stream failed:", error)
        if (!assistantSaved && fullText.trim()) {
          try {
            await saveMessage({
              threadId: thread.id,
              role: "assistant",
              content: fullText.trim(),
            })
          } catch (saveError) {
            console.error("Could not save assistant message:", saveError)
          }
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Assistant-Thread-Id": thread.id,
    },
  })
}

// Clears the current user's chat for a project.
export async function DELETE(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await readBody(request)
  const projectId = body?.projectId

  if (typeof projectId !== "string") {
    return Response.json({ error: "Invalid request" }, { status: 400 })
  }

  if (!(await canViewProject(projectId, user.id))) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const thread = await findThread(user.id, projectId)
  if (thread) {
    await clearThreadMessages(thread.id)
  }

  return Response.json({ ok: true })
}
