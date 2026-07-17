import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";
import { sendCouponEmail } from "../utils/email";

// Generates a readable 8-char coupon code, excluding ambiguous chars (0, O, I, L)
function generateCouponCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  for (const b of bytes) {
    code += chars[b % chars.length];
  }
  return code;
}

const publicKioskRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

publicKioskRouter.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  const org = await c.env.DB.prepare(
    "SELECT id FROM Organization WHERE slug = ?"
  ).bind(slug).first<{ id: string }>();
  if (!org) {
    return c.json({ error: { message: "Kiosk not found", code: "NOT_FOUND" } }, 404);
  }

  const config = await c.env.DB.prepare(
    "SELECT data FROM OrgKioskConfig WHERE organizationId = ?"
  ).bind(org.id).first<{ data: string }>();

  return c.json({ data: config ? JSON.parse(config.data) : null });
});

publicKioskRouter.post(
  "/:slug/quick-start",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      questionText: z.string().min(1),
      category: z.enum(["post_event", "preview", "general"]),
      starRating: z.number().int().min(1).max(5).optional(),
    })
  ),
  async (c) => {
    const slug = c.req.param("slug");
    const { name, email, questionText, category, starRating } = c.req.valid("json");

    const org = await c.env.DB.prepare(
      "SELECT id FROM Organization WHERE slug = ?"
    ).bind(slug).first<{ id: string }>();
    if (!org) {
      return c.json({ error: { message: "Kiosk not found", code: "NOT_FOUND" } }, 404);
    }

    const guestEmail =
      email ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@kiosk.guest`;
    const now = new Date().toISOString();

    let user = await c.env.DB.prepare("SELECT id FROM user WHERE email = ?")
      .bind(guestEmail)
      .first<{ id: string }>();

    if (!user) {
      const userId = crypto.randomUUID();
      await c.env.DB.prepare(
        "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)"
      ).bind(userId, name, guestEmail, now, now).run();
      user = { id: userId };
    } else {
      await c.env.DB.prepare(
        "UPDATE user SET name = ?, updatedAt = ? WHERE id = ?"
      ).bind(name, now, user.id).run();
    }

    const interviewId = crypto.randomUUID();
    const questionId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO Interview (id, userId, organizationId, title, spreadClips, starRating, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 0, ?, 'pending', ?, ?)`
      ).bind(interviewId, user.id, org.id, questionText, starRating ?? null, now, now),
      c.env.DB.prepare(
        "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)"
      ).bind(questionId, interviewId, questionText, category, now, now),
    ]);

    return c.json({ data: { interviewId, questionId } });
  }
);

publicKioskRouter.post(
  "/:slug/interviews/:interviewId/questions",
  zValidator(
    "json",
    z.object({
      questionText: z.string().min(1),
      category: z.enum(["post_event", "preview", "general"]),
    })
  ),
  async (c) => {
    const slug = c.req.param("slug");
    const interviewId = c.req.param("interviewId");
    const { questionText, category } = c.req.valid("json");

    const org = await c.env.DB.prepare(
      "SELECT id FROM Organization WHERE slug = ?"
    ).bind(slug).first<{ id: string }>();
    if (!org) {
      return c.json({ error: { message: "Kiosk not found", code: "NOT_FOUND" } }, 404);
    }

    const interview = await c.env.DB.prepare(
      "SELECT id FROM Interview WHERE id = ? AND organizationId = ?"
    ).bind(interviewId, org.id).first<{ id: string }>();
    if (!interview) {
      return c.json({ error: { message: "Interview not found", code: "NOT_FOUND" } }, 404);
    }

    const countRow = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM InterviewQuestion WHERE interviewId = ?"
    ).bind(interviewId).first<{ count: number }>();
    const sortOrder = countRow?.count ?? 0;

    const questionId = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(questionId, interviewId, questionText, category, sortOrder, now, now).run();

    return c.json({ data: { questionId } });
  }
);

publicKioskRouter.post(
  "/:slug/interviews/:interviewId/clips",
  zValidator(
    "json",
    z.object({
      questionId: z.string(),
      videoUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      duration: z.number().optional(),
    })
  ),
  async (c) => {
    const slug = c.req.param("slug");
    const interviewId = c.req.param("interviewId");
    const data = c.req.valid("json");
    const now = new Date().toISOString();

    const org = await c.env.DB.prepare(
      "SELECT id FROM Organization WHERE slug = ?"
    ).bind(slug).first<{ id: string }>();
    if (!org) {
      return c.json({ error: { message: "Kiosk not found", code: "NOT_FOUND" } }, 404);
    }

    const clipId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM InterviewClip WHERE questionId = ?").bind(data.questionId),
      c.env.DB.prepare(
        "INSERT INTO InterviewClip (id, interviewId, questionId, videoUrl, thumbnailUrl, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(clipId, interviewId, data.questionId, data.videoUrl, data.thumbnailUrl ?? null, data.duration ?? null, now),
    ]);

    const [questionsResult, clipsResult, interviewRow] = await Promise.all([
      c.env.DB.prepare("SELECT id FROM InterviewQuestion WHERE interviewId = ?").bind(interviewId).all(),
      c.env.DB.prepare("SELECT id FROM InterviewClip WHERE interviewId = ?").bind(interviewId).all(),
      c.env.DB.prepare(
        "SELECT i.starRating, i.userId, u.name AS userName, u.email AS userEmail FROM Interview i JOIN user u ON i.userId = u.id WHERE i.id = ?"
      ).bind(interviewId).first<{ starRating: number | null; userId: string; userName: string; userEmail: string }>(),
    ]);

    const questionCount = (questionsResult.results ?? []).length;
    const clipCount = (clipsResult.results ?? []).length;

    let couponCode: string | null = null;

    if (clipCount === questionCount && questionCount > 0 && interviewRow) {
      const rating = interviewRow.starRating;
      const completedStatus =
        rating === 1 || rating === 2 ? "dismissed" : "pending_approval";

      await c.env.DB.prepare(
        "UPDATE Interview SET status = ?, updatedAt = ? WHERE id = ?"
      ).bind(completedStatus, now, interviewId).run();

      // Only issue coupon for non-dismissed customer-mode interviews
      if (completedStatus !== "dismissed") {
        const configRow = await c.env.DB.prepare(
          "SELECT data FROM OrgKioskConfig WHERE organizationId = ?"
        ).bind(org.id).first<{ data: string }>();

        let rewardText = "";
        let kioskMode = "customer";
        if (configRow?.data) {
          try {
            const parsed = JSON.parse(configRow.data) as { rewardText?: string; kioskMode?: string };
            rewardText = parsed.rewardText ?? "";
            kioskMode = parsed.kioskMode ?? "customer";
          } catch { /* ignore */ }
        }

        if (kioskMode === "staff") rewardText = "";

        if (rewardText) {
          // Enforce 30-day rate limit: one coupon per user per org per 30 days
          const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const existingCoupon = await c.env.DB.prepare(
            "SELECT id FROM Coupon WHERE userId = ? AND organizationId = ? AND expiresAt > ? LIMIT 1"
          ).bind(interviewRow.userId, org.id, cutoff).first<{ id: string }>();

          if (!existingCoupon) {
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            couponCode = generateCouponCode();

            await c.env.DB.prepare(
              `INSERT INTO Coupon (id, code, organizationId, interviewId, userId, rewardText, expiresAt, createdAt)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).bind(
              crypto.randomUUID(),
              couponCode,
              org.id,
              interviewId,
              interviewRow.userId,
              rewardText,
              expiresAt,
              now
            ).run();

            c.executionCtx.waitUntil(
              sendCouponEmail(c.env, {
                name: interviewRow.userName,
                email: interviewRow.userEmail,
                rewardText,
                couponCode,
                expiresAt,
              }).catch((err) => console.error("[email] Error sending coupon:", err))
            );
          }
        }
      }
    }

    const clip = await c.env.DB.prepare(
      "SELECT * FROM InterviewClip WHERE id = ?"
    ).bind(clipId).first();

    return c.json({ data: { ...clip, isPublished: false, couponCode } });
  }
);

export { publicKioskRouter };
