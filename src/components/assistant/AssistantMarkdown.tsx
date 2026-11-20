import ReactMarkdown, { type Components } from "react-markdown"
import remarkGfm from "remark-gfm"
import { cn } from "@/lib/utils"

const components: Components = {
  p: ({ children }) => (
    <p className="my-1.5 leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  h1: ({ children }) => (
    <h1 className="mt-4 mb-1.5 text-sm font-semibold first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-4 mb-1.5 text-[11px] font-semibold tracking-wider uppercase first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-3 mb-1 text-sm font-semibold first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-3 mb-1 text-xs font-semibold first:mt-0">
      {children}
    </h4>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  del: ({ children }) => <del className="text-muted-foreground line-through">{children}</del>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-2 list-disc space-y-1 pl-4 marker:text-muted-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 list-decimal space-y-1 pl-4 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="pl-0.5 leading-relaxed [&>p]:my-0">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  code: ({ className, children }) => (
    <code
      className={cn(
        "bg-muted px-1 py-0.5 font-mono text-[0.85em] text-foreground",
        className
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 max-w-full overflow-x-auto border border-border bg-muted/50 p-3 text-xs leading-relaxed [&>code]:bg-transparent [&>code]:p-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 max-w-full overflow-x-auto border border-border">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/60">{children}</thead>,
  tbody: ({ children }) => (
    <tbody className="divide-y divide-border">{children}</tbody>
  ),
  tr: ({ children }) => <tr className="bg-card/40">{children}</tr>,
  th: ({ children }) => (
    <th className="px-2.5 py-2 text-[10px] font-semibold tracking-wider whitespace-nowrap text-muted-foreground uppercase">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2.5 py-2 align-top leading-relaxed [overflow-wrap:anywhere]">{children}</td>
  ),
}

export function AssistantMarkdown({ content }: { content: string }) {
  return (
    <div className="min-w-0 text-sm leading-relaxed text-foreground [overflow-wrap:anywhere] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
