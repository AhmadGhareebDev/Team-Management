import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function AuthLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex min-h-svh flex-col">
            <header className="p-4 sm:p-6">
                <Link
                    href="/"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                    <ArrowLeft className="size-4" />
                    Back
                </Link>
            </header>
            <main
                id="main"
                className="flex flex-1 items-start justify-center px-4 pb-12 sm:items-center"
            >
                <div className="w-full max-w-md">
                    {children}
                </div>
            </main>
        </div>
    )
}
