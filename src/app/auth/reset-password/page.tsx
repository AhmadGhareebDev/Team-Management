import { redirect } from "next/navigation"
import ResetPasswordForm from "./_components/ResetPasswordForm";


export const instant = false;


export default async function ResetPassword({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
    const { token , error } = await searchParams;

    if (error === "INVALID_TOKEN") redirect("/auth/login");
    if (!token) {
        redirect("/auth/login")
    }

    return <ResetPasswordForm token={token} />
}