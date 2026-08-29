import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import { emailOTP } from "better-auth/plugins"
import * as schema from "@/db/schemas";
import { sendEmail } from "@/lib/mailer";

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
        schema: schema,
    }),
    rateLimit: {
    enabled: true,
    customRules: {
        "/email-otp/send-verification-otp": {
            window: 60,
            max: 1, 
        },
        "/request-password-reset": {
            window: 60,
            max: 1,
        }
    },
},
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        autoSignIn: false,
        sendResetPassword: async ({user , url }) => {
            void sendEmail({
                to: user.email,
                subject: "Reset your password",
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                        <h2>Password Reset</h2>
                        <p>You have requested to reset your password. Click the link below to proceed:</p>
                        <a href="${url}" style="background-color: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `
            })
        }
    },
    emailVerification: {
        sendOnSignUp: true,
    },
    plugins: [
    emailOTP({
        overrideDefaultEmailVerification: true, 
        async sendVerificationOTP({ email, otp, type }) {
            let subject = "Verify your email";
            let htmlContent = `
                <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                    <h2>Welcome to Team Management</h2>
                    <p>Please use the following verification code to sign up:</p>
                    <h1 style="letter-spacing: 2px; color: #3b82f6;">${otp}</h1>
                    <p>This code will expire shortly.</p>
                </div>
            `;

            if (type === "forget-password") {
                subject = "Reset your password";
                htmlContent = `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
                        <h2>Password Reset Request</h2>
                        <p>We received a request to reset your password. Use this code to proceed:</p>
                        <h1 style="letter-spacing: 2px; color: #ef4444;">${otp}</h1>
                        <p>If you didn't request this, you can safely ignore this email.</p>
                    </div>
                `;
            }

            sendEmail({
                to: email,
                subject: subject,
                html: htmlContent,
            }).catch((err) => {
                console.error("Failed to send OTP email via Nodemailer:", err);
            });
        },
    }),
],

    user: {
        additionalFields: {
            username: {
                type: "string",
                required: true,
                unique: true,
            },
        }
    }
});