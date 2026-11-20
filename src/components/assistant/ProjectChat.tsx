"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react"
import {
  AlertCircle,
  Loader2,
  Maximize2,
  MessagesSquare,
  Minimize2,
  PanelLeftClose,
  Send,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { AssistantMarkdown } from "@/components/assistant/AssistantMarkdown"
import {
  AssistantProposalCard,
  type AssistantProposalStatus,
  type AssistantProposalView,
} from "@/components/assistant/AssistantProposalCard"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

type ChatRole = "user" | "assistant"
type ChatStatus = "loading" | "idle" | "streaming"

type ChatMessage = {
  id: string
  role: ChatRole
  content: string
  proposal?: AssistantProposalView | null
}

const SUGGESTIONS = [
  "Summarize the current state of this project.",
  "What should I work on next?",
  "What is blocking the team right now?",
]

const MIN_WIDTH = 320
const MAX_WIDTH = 760
const DEFAULT_WIDTH = 420
const WIDTH_STORAGE_KEY = "project-assistant-width"

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)))
}

async function readError(response: Response) {
  try {
    const data = (await response.json()) as { error?: unknown }
    if (typeof data.error === "string") return data.error
  } catch {}

  return "Something went wrong. Please try again."
}

function Thinking() {
  return (
    <span
      role="status"
      aria-label="Assistant is thinking"
      className="flex items-center gap-1 py-1"
    >
      <span className="size-1.5 animate-bounce bg-muted-foreground [animation-delay:-0.3s] motion-reduce:animate-none" />
      <span className="size-1.5 animate-bounce bg-muted-foreground [animation-delay:-0.15s] motion-reduce:animate-none" />
      <span className="size-1.5 animate-bounce bg-muted-foreground motion-reduce:animate-none" />
    </span>
  )
}

function ChatSurface({
  projectName,
  messages,
  status,
  error,
  input,
  confirmClear,
  onInputChange,
  onSend,
  onStop,
  onClear,
  onConfirmClear,
  onClose,
  onToggleExpanded,
  onProposalStatusChange,
  expanded,
  mobile = false,
}: {
  projectName: string
  messages: ChatMessage[]
  status: ChatStatus
  error: string | null
  input: string
  confirmClear: boolean
  onInputChange: (value: string) => void
  onSend: (message?: string) => void
  onStop: () => void
  onClear: () => void
  onConfirmClear: () => void
  onClose: () => void
  onToggleExpanded: () => void
  onProposalStatusChange: (id: string, status: AssistantProposalStatus) => void
  expanded: boolean
  mobile?: boolean
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const disabled = status === "loading"
  const empty = messages.length === 0

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, status])

  return (
    <div
      className={cn(
        "flex h-full min-h-0 w-full min-w-0 flex-col",
        expanded ? "bg-sidebar" : "bg-sidebar/40"
      )}
    >
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground">
          <Sparkles className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold tracking-wider uppercase">
            Project assistant
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {projectName}
          </p>
        </div>

        {confirmClear ? (
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={onClear}
            className="px-2"
          >
            Clear?
          </Button>
        ) : (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onConfirmClear}
            disabled={empty}
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}

        {!mobile && (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={onToggleExpanded}
            aria-label={expanded ? "Exit full screen" : "Full screen assistant"}
            title={expanded ? "Exit full screen" : "Full screen"}
          >
            {expanded ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
        )}

        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          onClick={onClose}
          aria-label="Close project assistant"
          title="Close assistant"
        >
          {mobile ? <X className="size-3.5" /> : <PanelLeftClose className="size-3.5" />}
        </Button>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
      >
        <div
          role="log"
          aria-label="Conversation with the project assistant"
          className={cn(
            "flex min-h-full min-w-0 flex-col gap-4 px-3 py-4",
            expanded && "mx-auto w-full max-w-3xl"
          )}
        >
          {status === "loading" && empty && (
            <div className="flex flex-1 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading conversation
            </div>
          )}

          {status !== "loading" && empty && (
            <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
              <div className="flex size-10 items-center justify-center border border-border bg-card text-muted-foreground">
                <MessagesSquare className="size-5" />
              </div>
              <p className="mt-3 text-sm font-medium">Ask about this project</p>
              <p className="mt-1 max-w-56 text-xs leading-relaxed text-muted-foreground">
                The assistant can see this project&apos;s tasks, members, and
                deadlines.
              </p>
              <div className="mt-5 grid w-full gap-1.5">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => onSend(suggestion)}
                    className="border border-border bg-card px-3 py-2 text-left text-xs leading-relaxed text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex min-w-0 gap-2.5",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center border border-border bg-card text-muted-foreground">
                  <Sparkles className="size-3" aria-hidden="true" />
                </span>
              )}
              <div
                className={cn(
                  "max-w-[85%] min-w-0 [overflow-wrap:anywhere]",
                  message.role === "user"
                    ? "bg-secondary px-3 py-2 text-sm leading-relaxed text-secondary-foreground"
                    : "text-sm leading-relaxed text-foreground"
                )}
              >
                {message.content ? (
                  message.role === "assistant" ? (
                    <>
                      <AssistantMarkdown content={message.content} />
                      {message.proposal && (
                        <AssistantProposalCard
                          proposal={message.proposal}
                          onStatusChange={onProposalStatusChange}
                        />
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.content}</p>
                  )
                ) : status === "streaming" ? (
                  <Thinking />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSend()
        }}
        className="border-t border-border bg-sidebar p-3"
      >
        <div className={cn("min-w-0", expanded && "mx-auto w-full max-w-3xl")}>
          <div className="flex items-end gap-1.5 border border-input bg-background p-1.5 transition-colors focus-within:border-ring">
          <textarea
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                onSend()
              }
            }}
            rows={1}
            maxLength={4000}
            disabled={disabled}
            aria-label="Message the project assistant"
            placeholder="Ask about this project..."
            className="max-h-32 min-h-8 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-sm leading-relaxed outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {status === "streaming" ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={onStop}
              aria-label="Stop response"
              title="Stop response"
              className="shrink-0 max-lg:size-11"
            >
              <Square className="size-3 fill-current" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              disabled={disabled || !input.trim()}
              aria-label="Send message"
              title="Send message"
              className="shrink-0 max-lg:size-11"
            >
              <Send className="size-3.5" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-[10px] tracking-wide text-muted-foreground">
          Enter to send · Shift + Enter for a new line
        </p>
        </div>
      </form>
    </div>
  )
}

// Project-scoped chat panel attached to the left edge of the canvas.
export function ProjectChat({
  projectId,
  projectName,
}: {
  projectId: string
  projectName: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [status, setStatus] = useState<ChatStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [desktopOpen, setDesktopOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [width, setWidth] = useState(DEFAULT_WIDTH)
  const [expanded, setExpanded] = useState(false)
  const [resizing, setResizing] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const widthRef = useRef(width)
  const resizeStart = useRef({ x: 0, width: DEFAULT_WIDTH })

  useEffect(() => {
    widthRef.current = width
  }, [width])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem("project-assistant-open")
      if (stored !== null) setDesktopOpen(stored === "true")

      const storedWidth = window.localStorage.getItem(WIDTH_STORAGE_KEY)
      if (storedWidth !== null) {
        const parsedWidth = Number(storedWidth)
        if (Number.isFinite(parsedWidth)) {
          const clampedWidth = clampWidth(parsedWidth)
          widthRef.current = clampedWidth
          setWidth(clampedWidth)
        }
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  const loadHistory = useCallback(async () => {
    setStatus("loading")
    setError(null)

    try {
      const response = await fetch(
        `/api/assistant/chat?projectId=${encodeURIComponent(projectId)}`,
        { cache: "no-store" }
      )

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      const data = (await response.json()) as { messages?: ChatMessage[] }
      setMessages(data.messages ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load the conversation."
      )
    } finally {
      setStatus("idle")
    }
  }, [projectId])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadHistory()
    })

    return () => {
      window.cancelAnimationFrame(frame)
      abortRef.current?.abort()
    }
  }, [loadHistory])

  useEffect(() => {
    if (!confirmClear) return

    const timer = window.setTimeout(() => setConfirmClear(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmClear])

  function setDesktopPanel(next: boolean) {
    setDesktopOpen(next)
    if (!next) setExpanded(false)
    try {
      window.localStorage.setItem("project-assistant-open", String(next))
    } catch {}
  }

  function persistWidth(value: number) {
    try {
      window.localStorage.setItem(WIDTH_STORAGE_KEY, String(value))
    } catch {}
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (expanded) return
    event.preventDefault()
    resizeStart.current = { x: event.clientX, width: widthRef.current }
    event.currentTarget.setPointerCapture(event.pointerId)
    setResizing(true)
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    const next =
      resizeStart.current.width + event.clientX - resizeStart.current.x
    const clamped = clampWidth(next)
    widthRef.current = clamped
    setWidth(clamped)
  }

  function handleResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setResizing(false)
    persistWidth(widthRef.current)
  }

  function handleResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 64 : 16
    let next = widthRef.current

    if (event.key === "ArrowLeft") next -= step
    else if (event.key === "ArrowRight") next += step
    else if (event.key === "Home") next = MIN_WIDTH
    else if (event.key === "End") next = MAX_WIDTH
    else return

    event.preventDefault()
    const clamped = clampWidth(next)
    widthRef.current = clamped
    setWidth(clamped)
    persistWidth(clamped)
  }

  function stop() {
    abortRef.current?.abort()
  }

  function handleProposalStatusChange(
    id: string,
    nextStatus: AssistantProposalStatus
  ) {
    setMessages((current) =>
      current.map((message) =>
        message.proposal?.id === id
          ? { ...message, proposal: { ...message.proposal, status: nextStatus } }
          : message
      )
    )
  }

  async function send(message?: string) {
    const content = (message ?? input).trim()
    if (!content || status === "loading" || status === "streaming") return

    setError(null)
    setInput("")

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    }
    const assistantId = crypto.randomUUID()

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantId, role: "assistant", content: "" },
    ])
    setStatus("streaming")

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, message: content }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      if (!response.body) {
        throw new Error("The assistant returned no response.")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        fullText += decoder.decode(value, { stream: true })
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId ? { ...item, content: fullText } : item
          )
        )
      }

      if (!fullText.trim()) {
        setMessages((current) =>
          current.filter((item) => item.id !== assistantId)
        )
        setError("The assistant returned an empty response.")
      }
    } catch (sendError) {
      if (sendError instanceof DOMException && sendError.name === "AbortError") {
        setMessages((current) =>
          current.filter(
            (item) => item.id !== assistantId || item.content.trim().length > 0
          )
        )
      } else {
        setMessages((current) =>
          current.filter((item) => item.id !== assistantId)
        )
        setError(
          sendError instanceof Error
            ? sendError.message
            : "The assistant request failed."
        )
      }
    } finally {
      abortRef.current = null
      await loadHistory()
    }
  }

  async function clear() {
    setConfirmClear(false)

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      })

      if (!response.ok) {
        throw new Error(await readError(response))
      }

      setMessages([])
      setError(null)
      toast.add({ type: "success", description: "Conversation cleared." })
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : "Could not clear the conversation."
      )
    }
  }

  return (
    <>
      {!expanded && (desktopOpen ? (
        <aside
          className="relative hidden h-full shrink-0 border-r border-border lg:flex"
          style={{ width }}
        >
          <ChatSurface
            projectName={projectName}
            messages={messages}
            status={status}
            error={error}
            input={input}
            confirmClear={confirmClear}
            onInputChange={setInput}
            onSend={send}
            onStop={stop}
            onClear={clear}
            onConfirmClear={() => setConfirmClear(true)}
            onClose={() => setDesktopPanel(false)}
            onToggleExpanded={() => setExpanded((value) => !value)}
            onProposalStatusChange={handleProposalStatusChange}
            expanded={false}
          />

          <div
            role="separator"
              aria-orientation="vertical"
              aria-label="Resize assistant panel"
              aria-valuemin={MIN_WIDTH}
              aria-valuemax={MAX_WIDTH}
              aria-valuenow={width}
              tabIndex={0}
              onPointerDown={handleResizeStart}
              onPointerMove={handleResizeMove}
              onPointerUp={handleResizeEnd}
              onPointerCancel={handleResizeEnd}
              onKeyDown={handleResizeKey}
              className="group/resize absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize touch-none focus-visible:outline-none"
            >
              <span
                className={cn(
                  "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border transition-colors group-hover/resize:bg-primary group-focus/resize:bg-primary",
                  resizing && "bg-primary"
                )}
              />
          </div>
        </aside>
      ) : (
        <aside className="hidden h-full w-12 shrink-0 flex-col items-center border-r border-border bg-sidebar/40 py-3 lg:flex">
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setDesktopPanel(true)}
                  aria-label="Open project assistant"
                  className="relative flex size-9 items-center justify-center text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"
                />
              }
            >
              <MessagesSquare className="size-4" />
              {status === "streaming" && (
                <span className="absolute top-1 right-1 size-1.5 animate-pulse bg-amber-500 motion-reduce:animate-none" />
              )}
            </TooltipTrigger>
            <TooltipContent side="right">Open assistant</TooltipContent>
          </Tooltip>
        </aside>
      ))}

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open project assistant"
        title="Open assistant"
        className="fixed right-4 bottom-4 z-40 flex size-12 items-center justify-center bg-primary text-primary-foreground shadow-md transition-transform active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none lg:hidden"
      >
        <MessagesSquare className="size-5" />
        {status === "streaming" && (
          <span className="absolute top-2 right-2 size-1.5 animate-pulse bg-amber-400 motion-reduce:animate-none" />
        )}
      </button>

      <Sheet open={expanded} onOpenChange={setExpanded}>
        <SheetContent
          side="left"
          showCloseButton={false}
          style={{ width: "100vw", maxWidth: "none" }}
          className="h-dvh border-r border-border p-0"
        >
          <SheetTitle className="sr-only">Project assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Full screen chat with the assistant about this project.
          </SheetDescription>
          <ChatSurface
            expanded
            projectName={projectName}
            messages={messages}
            status={status}
            error={error}
            input={input}
            confirmClear={confirmClear}
            onInputChange={setInput}
            onSend={send}
            onStop={stop}
            onClear={clear}
            onConfirmClear={() => setConfirmClear(true)}
            onClose={() => setExpanded(false)}
            onToggleExpanded={() => setExpanded(false)}
            onProposalStatusChange={handleProposalStatusChange}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[min(22rem,88vw)] max-w-[22rem] p-0"
        >
          <SheetTitle className="sr-only">Project assistant</SheetTitle>
          <SheetDescription className="sr-only">
            Chat with the assistant about this project.
          </SheetDescription>
          <ChatSurface
            mobile
            projectName={projectName}
            messages={messages}
            status={status}
            error={error}
            input={input}
            confirmClear={confirmClear}
            onInputChange={setInput}
            onSend={send}
            onStop={stop}
            onClear={clear}
            onConfirmClear={() => setConfirmClear(true)}
            onClose={() => setMobileOpen(false)}
            onToggleExpanded={() => {}}
            onProposalStatusChange={handleProposalStatusChange}
            expanded={false}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
