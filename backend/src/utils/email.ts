import { Resend } from "resend";
import type { Env } from "../env";

export async function sendRewardEmail(
  env: Env,
  { name, email, rewardText }: { name: string; email: string; rewardText: string }
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reward email");
    return;
  }

  if (email.endsWith("@kiosk.guest") || email.endsWith("@popstroke.guest")) {
    console.log(`[email] Skipping reward email for guest: ${email}`);
    return;
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">Thanks for your feedback!</h2>
      <p style="color:#333;font-size:16px;line-height:1.6">Hi ${name},</p>
      <p style="color:#333;font-size:16px;line-height:1.6">
        Thank you for sharing your experience with us! As a thank you, here's your reward:
      </p>
      <p style="color:#1a1a1a;font-size:20px;font-weight:bold;padding:16px;background:#f5f5f5;border-radius:8px;text-align:center">
        ${rewardText}
      </p>
      <p style="color:#333;font-size:16px;line-height:1.6">We appreciate your time!</p>
    </div>
  `;

  const client = new Resend(env.RESEND_API_KEY);
  const result = await client.emails.send({
    from: env.RESEND_FROM_EMAIL ?? "rewards@resend.dev",
    to: email,
    subject: "Thanks for your feedback!",
    html,
  });

  if (result.error) {
    console.error("[email] Failed to send:", result.error);
  } else {
    console.log(`[email] Sent to ${email} (id: ${result.data?.id})`);
  }
}
