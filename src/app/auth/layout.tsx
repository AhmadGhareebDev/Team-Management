import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"

export default function AuthLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <div className=" absolute top-5 left-5 ">
                <Link href="/" className={buttonVariants({variant:"secondary"})}>
                    <ArrowLeft className="size-4"/>
                    Go Back
                </Link>
            </div>
            <div className="w-full max-w-md mx-auto py-6">
            {children}
            </div>
        </div>
    )
}