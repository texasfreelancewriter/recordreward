import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { Resend } from "resend";
import type { Env, AppVariables } from "../env";

const invitesRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// POST /api/invites — send invite to a client email for an org
invitesRouter.post(
  "/",
  zValidator("json", z.object({
    email: z.string().email(),
    orgId: z.string(),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const { email, orgId } = c.req.valid("json");

    // Only owners can invite
    const membership = await c.env.DB.prepare(
      "SELECT role FROM OrgMember WHERE organizationId = ? AND userId = ?"
    ).bind(orgId, user.id).first<{ role: string }>();

    if (!membership || membership.role !== "owner") {
      return c.json({ error: { message: "Only owners can invite clients", code: "FORBIDDEN" } }, 403);
    }

    const org = await c.env.DB.prepare(
      "SELECT id, name FROM Organization WHERE id = ?"
    ).bind(orgId).first<{ id: string; name: string }>();

    if (!org) return c.json({ error: { message: "Organization not found", code: "NOT_FOUND" } }, 404);

    // Check if already a member
    const existingUser = await c.env.DB.prepare(
      `SELECT u.id FROM "user" u
       JOIN OrgMember m ON m.userId = u.id
       WHERE u.email = ? AND m.organizationId = ?`
    ).bind(email, orgId).first();

    if (existingUser) {
      return c.json({ error: { message: "This person is already a member", code: "ALREADY_MEMBER" } }, 409);
    }

    // Create invite token
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const inviteId = crypto.randomUUID();

    // Cancel any existing pending invite for this email+org
    await c.env.DB.prepare(
      "UPDATE OrgInvite SET status = 'cancelled' WHERE email = ? AND organizationId = ? AND status = 'pending'"
    ).bind(email, orgId).run();

    await c.env.DB.prepare(
      "INSERT INTO OrgInvite (id, organizationId, email, token, role, status, expiresAt) VALUES (?, ?, ?, ?, 'member', 'pending', ?)"
    ).bind(inviteId, orgId, email, token, expiresAt).run();

    // Send invite email
    if (c.env.RESEND_API_KEY) {
      const resend = new Resend(c.env.RESEND_API_KEY);
      const appUrl = "https://app.recordreward.com";
      await resend.emails.send({
        from: c.env.RESEND_FROM_EMAIL ?? "hello@recordreward.com",
        to: email,
        subject: `You've been invited to manage ${org.name} on Record Reward`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="margin:0 0 8px">You're invited to Record Reward</h2>
            <p style="color:#555;margin:0 0 24px">
              <strong>${user.name || user.email}</strong> has invited you to manage
              <strong>${org.name}</strong> — view your customer interviews and kiosk settings.
            </p>
            <a href="${appUrl}/invite/${token}"
               style="display:inline-block;background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">
              Accept Invitation
            </a>
            <p style="color:#999;font-size:12px;margin:24px 0 0">
              This invite expires in 7 days. If you didn't expect this, you can ignore it.
            </p>
          </div>
        `,
      });
    }

    return c.json({ data: { id: inviteId } });
  }
);

// GET /api/invites/:token — get invite details (public, for the accept page)
invitesRouter.get("/:token", async (c) => {
  const token = c.req.param("token");

  const invite = await c.env.DB.prepare(
    `SELECT i.id, i.email, i.status, i.expiresAt, o.name AS orgName
     FROM OrgInvite i
     JOIN Organization o ON o.id = i.organizationId
     WHERE i.token = ?`
  ).bind(token).first<{ id: string; email: string; status: string; expiresAt: string; orgName: string }>();

  if (!invite) return c.json({ error: { message: "Invite not found", code: "NOT_FOUND" } }, 404);
  if (invite.status !== "pending") return c.json({ error: { message: "Invite is no longer valid", code: "INVALID" } }, 410);
  if (new Date(invite.expiresAt) < new Date()) return c.json({ error: { message: "Invite has expired", code: "EXPIRED" } }, 410);

  return c.json({ data: { id: invite.id, email: invite.email, orgName: invite.orgName } });
});

// POST /api/invites/:token/accept — accept invite (must be logged in)
invitesRouter.post("/:token/accept", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const token = c.req.param("token");

  const invite = await c.env.DB.prepare(
    "SELECT id, organizationId, email, status, expiresAt FROM OrgInvite WHERE token = ?"
  ).bind(token).first<{ id: string; organizationId: string; email: string; status: string; expiresAt: string }>();

  if (!invite) return c.json({ error: { message: "Invite not found", code: "NOT_FOUND" } }, 404);
  if (invite.status !== "pending") return c.json({ error: { message: "Invite already used", code: "INVALID" } }, 410);
  if (new Date(invite.expiresAt) < new Date()) return c.json({ error: { message: "Invite expired", code: "EXPIRED" } }, 410);

  // Add as member
  const memberId = crypto.randomUUID();
  const now = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO OrgMember (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, 'member', ?)"
    ).bind(memberId, invite.organizationId, user.id, now),
    c.env.DB.prepare(
      "UPDATE OrgInvite SET status = 'accepted' WHERE id = ?"
    ).bind(invite.id),
  ]);

  return c.json({ data: { orgId: invite.organizationId } });
});

export { invitesRouter };
