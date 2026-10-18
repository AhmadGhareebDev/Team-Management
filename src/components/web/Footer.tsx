import Link from "next/link"

const LINKS = [
  { href: "/auth/login", label: "Log in" },
  { href: "/auth/signup", label: "Sign up" },
]

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="text-sm font-semibold uppercase tracking-widest text-foreground">
          Team Management
        </span>

        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
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
