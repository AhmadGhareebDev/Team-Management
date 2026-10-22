import Link from "next/link"

const LINKS = [
  { href: "/auth/login", label: "Log in" },
  { href: "/auth/signup", label: "Sign up" },
]

export function Footer() {
  return (
    <footer className="border-t border-border px-4 py-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
          Team Management
        </span>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 Team Management
        </p>
      </div>
    </footer>
  )
}
