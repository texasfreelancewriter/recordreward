import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";
import { sendRewardEmail } from "../utils/email";

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
      starRating: z.number().int().min(1).max(4).optional(),
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
        "SELECT i.starRating, u.name AS userName, u.email AS userEmail FROM Interview i JOIN user u ON i.userId = u.id WHERE i.id = ?"
      ).bind(interviewId).first<{ starRating: number | null; userName: string; userEmail: string }>(),
    ]);

    const questionCount = (questionsResult.results ?? []).length;
    const clipCount = (clipsResult.results ?? []).length;

    if (clipCount === questionCount && questionCount > 0 && interviewRow) {
      const rating = interviewRow.starRating;
      const completedStatus =
        rating === 1 || rating === 2 ? "dismissed" : "pending_approval";

      await c.env.DB.prepare(
        "UPDATE Interview SET status = ?, updatedAt = ? WHERE id = ?"
      ).bind(completedStatus, now, interviewId).run();

      c.executionCtx.waitUntil(
        (async () => {
          try {
            const configRow = await c.env.DB.prepare(
              "SELECT data FROM OrgKioskConfig WHERE organizationId = ?"
            ).bind(org.id).first<{ data: string }>();

            let rewardText = "";
            if (configRow?.data) {
              try {
                rewardText = (JSON.parse(configRow.data) as { rewardText?: string }).rewardText ?? "";
              } catch { /* ignore */ }
            }
            if (!rewardText) return;

            await sendRewardEmail(c.env, {
              name: interviewRow.userName,
              email: interviewRow.userEmail,
              rewardText,
            });
          } catch (err) {
            console.error("[email] Error sending reward email:", err);
          }
        })()
      );
    }

    const clip = await c.env.DB.prepare(
      "SELECT * FROM InterviewClip WHERE id = ?"
    ).bind(clipId).first();

    return c.json({ data: { ...clip, isPublished: false } });
  }
);

export { publicKioskRouter };
