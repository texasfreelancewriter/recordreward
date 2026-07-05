import { Resend } from "resend";
import type { Env } from "../env";

function isGuestEmail(email: string): boolean {
  return email.endsWith("@kiosk.guest") || email.endsWith("@popstroke.guest");
}

export async function sendRewardEmail(
  env: Env,
  { name, email, rewardText }: { name: string; email: string; rewardText: string }
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping reward email");
    return;
  }

  if (isGuestEmail(email)) {
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

export async function sendCouponEmail(
  env: Env,
  {
    name,
    email,
    rewardText,
    couponCode,
    expiresAt,
  }: { name: string; email: string; rewardText: string; couponCode: string; expiresAt: string }
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping coupon email");
    return;
  }

  if (isGuestEmail(email)) {
    console.log(`[email] Skipping coupon email for guest: ${email}`);
    return;
  }

  const expireDate = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const walletUrl = env.APP_BASE_URL ? `${env.APP_BASE_URL}/wallet` : "https://app.recordreward.com/wallet";

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a">Your reward is ready!</h2>
      <p style="color:#333;font-size:16px;line-height:1.6">Hi ${name},</p>
      <p style="color:#333;font-size:16px;line-height:1.6">
        Thank you for sharing your experience! Here's your reward:
      </p>
      <div style="padding:20px;background:#f5f5f5;border-radius:8px;text-align:center;margin:16px 0">
        <p style="color:#1a1a1a;font-size:18px;font-weight:bold;margin:0 0 12px">${rewardText}</p>
        <p style="color:#555;font-size:13px;margin:0 0 8px">Show this code at the register:</p>
        <p style="color:#1a1a1a;font-size:28px;font-weight:bold;letter-spacing:4px;font-family:monospace;margin:0;padding:12px;background:#fff;border-radius:6px;border:2px solid #e0e0e0">${couponCode}</p>
      </div>
      <div style="text-align:center;margin:24px 0">
        <a href="${walletUrl}" style="display:inline-block;padding:12px 24px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">
          View in Wallet
        </a>
        <p style="color:#888;font-size:13px;margin-top:8px">See all your rewards in one place — sign in with this email.</p>
      </div>
      <p style="color:#888;font-size:13px;line-height:1.5">
        This reward expires on <strong>${expireDate}</strong>. One use per customer, valid on your next visit.
      </p>
    </div>
  `;

  const client = new Resend(env.RESEND_API_KEY);
  const result = await client.emails.send({
    from: env.RESEND_FROM_EMAIL ?? "rewards@resend.dev",
    to: email,
    subject: `Your reward code: ${couponCode}`,
    html,
  });

  if (result.error) {
    console.error("[email] Failed to send coupon:", result.error);
  } else {
    console.log(`[email] Coupon sent to ${email} (id: ${result.data?.id})`);
  }
}

