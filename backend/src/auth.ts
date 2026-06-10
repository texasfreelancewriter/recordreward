import { betterAuth } from "better-auth";
import { kyselyAdapter } from "@better-auth/kysely-adapter";
import { emailOTP } from "better-auth/plugins";
import { Kysely } from "kysely";
import { D1Dialect } from "kysely-d1";
import { Resend } from "resend";
import type { Env } from "./env";

export function createAuth(env: Env) {
  const db = new Kysely({ dialect: new D1Dialect({ database: env.DB }) });
  const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  return betterAuth({
    database: kyselyAdapter(db, { type: "sqlite" }),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [
      "http://localhost:*",
      "http://127.0.0.1:*",
      "https://*.dev.vibecode.run",
      "https://*.vibecode.run",
      "https://*.vibecodeapp.com",
      "https://*.vibecode.dev",
      "https://vibecode.dev",
      "https://*.pages.dev",
      "https://recordreward.com",
      "https://www.recordreward.com",
      "https://app.recordreward.com",
    ],
    plugins: [
      emailOTP({
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== "sign-in" || !resend) return;
          await resend.emails.send({
            from: env.RESEND_FROM_EMAIL ?? "noreply@resend.dev",
            to: email,
            subject: "Your sign-in code",
            html: `<p>Your sign-in code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
          });
        },
      }),
    ],
    advanced: {
      trustedProxyHeaders: true,
      disableCSRFCheck: true,
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
      },
    },
  });
}
