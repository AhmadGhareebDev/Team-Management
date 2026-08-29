import "server-only"
import { SignJWT , jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.BETTER_AUTH_SECRET);

export async function createEmailVerifyToken(email: string): Promise<string> {
  return await new SignJWT({ purpose: "email-verification" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(secret)
}


export async function verifyEmailVerifyToken(
  token: string
): Promise<{ email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    if (payload.purpose !== "email-verification" || !payload.sub) return null
    return { email: payload.sub }
  } catch {
    return null
  }
}