import { redirect } from "next/navigation"
import ResetPasswordForm from "./_components/ResetPasswordForm";
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset Password",
}

/**
 * The reset token arrives in the URL and is consumed here, so this page is
 * inherently per-request and cannot be prerendered into a shared shell.
 */
export const instant = false

export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
    const { token , error } = await searchParams;

    if (error === "INVALID_TOKEN") redirect("/auth/login");
    if (!token) {
        redirect("/auth/login")
    }

    return <ResetPasswordForm token={token} />
}