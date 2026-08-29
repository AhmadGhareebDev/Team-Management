import { verifyEmailVerifyToken } from "@/lib/email-verify-token"
import { redirect } from "next/navigation"
import VerifyEmailForm from "./_components/VerifyEmailForm"

export const metadata = {
  title: "Verify Email",
  description: "Verify your email address to access your account.",
}


export const instant = false;

export default async function VerifyEmail({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    redirect("/auth/signup")
  }

  const checkResult = await verifyEmailVerifyToken(token);

  if (!checkResult) {
    redirect("/auth/signup")
  }

  const { email } = checkResult;

  return <VerifyEmailForm email={email} />


}