import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";
import {
  fetchInterviewWithDetails,
  fetchInterviewsWithDetails,
  type DbInterviewQuestionTemplate,
  type DbUser,
} from "../lib/db";
import {
  CreateInterviewSchema,
  CreateInterviewQuestionTemplateSchema,
  UpdateInterviewQuestionTemplateSchema,
  CreateInterviewClipSchema,
} from "../types";
import { sendRewardEmail } from "../utils/email";

const interviewsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ============================================
// Question Templates
// ============================================

interviewsRouter.get("/templates", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM InterviewQuestionTemplate ORDER BY sortOrder ASC"
  ).all<DbInterviewQuestionTemplate>();

  return c.json({
    data: (results ?? []).map((t) => ({ ...t, isActive: t.isActive === 1 })),
  });
});

interviewsRouter.post(
  "/templates",
  zValidator("json", CreateInterviewQuestionTemplateSchema),
  async (c) => {
    const data = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO InterviewQuestionTemplate (id, questionText, category, sortOrder, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        data.questionText,
        data.category,
        data.sortOrder ?? 0,
        data.isActive !== false ? 1 : 0,
        now,
        now
      )
      .run();

    const template = await c.env.DB.prepare(
      "SELECT * FROM InterviewQuestionTemplate WHERE id = ?"
    ).bind(id).first<DbInterviewQuestionTemplate>();

    return c.json({ data: { ...template!, isActive: template!.isActive === 1 } });
  }
);

interviewsRouter.patch(
  "/templates/:id",
  zValidator("json", UpdateInterviewQuestionTemplateSchema),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const now = new Date().toISOString();

    const sets: string[] = ["updatedAt = ?"];
    const binds: (string | number)[] = [now];

    if (data.questionText !== undefined) { sets.push("questionText = ?"); binds.push(data.questionText); }
    if (data.category !== undefined) { sets.push("category = ?"); binds.push(data.category); }
    if (data.sortOrder !== undefined) { sets.push("sortOrder = ?"); binds.push(data.sortOrder); }
    if (data.isActive !== undefined) { sets.push("isActive = ?"); binds.push(data.isActive ? 1 : 0); }

    await c.env.DB.prepare(
      `UPDATE InterviewQuestionTemplate SET ${sets.join(", ")} WHERE id = ?`
    ).bind(...binds, id).run();

    const template = await c.env.DB.prepare(
      "SELECT * FROM InterviewQuestionTemplate WHERE id = ?"
    ).bind(id).first<DbInterviewQuestionTemplate>();

    return c.json({ data: { ...template!, isActive: template!.isActive === 1 } });
  }
);

interviewsRouter.delete("/templates/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM InterviewQuestionTemplate WHERE id = ?").bind(id).run();
  return c.json({ data: { success: true } });
});

// ============================================
// Interviews
// ============================================

interviewsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  const orgId = c.req.query("orgId");
  const includeAll = c.req.query("includeAll") === "true";

  let resolvedOrgId: string | null = null;

  if (orgId) {
    // Verify user is a member of the requested org
    const membership = await c.env.DB.prepare(
      "SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?"
    ).bind(user.id, orgId).first();
    if (!membership) return c.body(null, 403);
    resolvedOrgId = orgId;
  } else {
    const membership = await c.env.DB.prepare(
      "SELECT organizationId FROM OrgMember WHERE userId = ? LIMIT 1"
    ).bind(user.id).first<{ organizationId: string }>();
    resolvedOrgId = membership?.organizationId ?? null;
  }

  const where = resolvedOrgId
    ? includeAll
      ? "WHERE i.organizationId = ?"
      : "WHERE i.organizationId = ? AND i.status != 'dismissed'"
    : includeAll
    ? ""
    : "WHERE i.status != 'dismissed'";

  const binds = resolvedOrgId ? [resolvedOrgId] : [];
  const interviews = await fetchInterviewsWithDetails(c.env.DB, where, binds);
  return c.json({ data: interviews });
});

interviewsRouter.get("/users/list", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, email, image FROM user ORDER BY name ASC"
  ).all<{ id: string; name: string; email: string; image: string | null }>();
  return c.json({ data: results ?? [] });
});

interviewsRouter.post(
  "/quick-start",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      questionText: z.string().min(1),
      category: z.enum(["post_event", "preview", "general"]),
    })
  ),
  async (c) => {
    const { name, email, questionText, category } = c.req.valid("json");
    const guestEmail =
      email ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@popstroke.guest`;
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
        "INSERT INTO Interview (id, userId, title, spreadClips, status, createdAt, updatedAt) VALUES (?, ?, ?, 0, 'pending', ?, ?)"
      ).bind(interviewId, user.id, questionText, now, now),
      c.env.DB.prepare(
        "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, 0, ?, ?)"
      ).bind(questionId, interviewId, questionText, category, now, now),
    ]);

    return c.json({ data: { interviewId, questionId } });
  }
);

interviewsRouter.get("/:id", async (c) => {
  const interview = await fetchInterviewWithDetails(c.env.DB, c.req.param("id"));
  if (!interview) {
    return c.json({ error: { message: "Interview not found", code: "NOT_FOUND" } }, 404);
  }
  return c.json({ data: interview });
});

interviewsRouter.post(
  "/",
  zValidator("json", CreateInterviewSchema),
  async (c) => {
    const data = c.req.valid("json");
    const now = new Date().toISOString();
    const interviewId = crypto.randomUUID();

    let questionDefs: Array<{ questionText: string; category: string }>;

    if (data.customQuestions?.length) {
      questionDefs = data.customQuestions;
    } else {
      const { results } = await c.env.DB.prepare(
        "SELECT questionText, category FROM InterviewQuestionTemplate WHERE isActive = 1 ORDER BY sortOrder ASC"
      ).all<{ questionText: string; category: string }>();
      questionDefs = results ?? [];
    }

    const questionInserts = questionDefs.map((q, i) =>
      c.env.DB.prepare(
        "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(crypto.randomUUID(), interviewId, q.questionText, q.category, i, now, now)
    );

    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO Interview (id, userId, title, spreadClips, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'pending', ?, ?)"
      ).bind(interviewId, data.userId, data.title ?? "Interview", data.spreadClips !== false ? 1 : 0, now, now),
      ...questionInserts,
    ]);

    const interview = await fetchInterviewWithDetails(c.env.DB, interviewId);
    return c.json({ data: interview });
  }
);

interviewsRouter.patch(
  "/:id",
  zValidator(
    "json",
    z.object({
      status: z.enum(["pending", "recorded", "published", "pending_approval", "dismissed"]).optional(),
      title: z.string().optional(),
      spreadClips: z.boolean().optional(),
    })
  ),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const now = new Date().toISOString();

    const sets: string[] = ["updatedAt = ?"];
    const binds: (string | number)[] = [now];

    if (data.status !== undefined) { sets.push("status = ?"); binds.push(data.status); }
    if (data.title !== undefined) { sets.push("title = ?"); binds.push(data.title); }
    if (data.spreadClips !== undefined) { sets.push("spreadClips = ?"); binds.push(data.spreadClips ? 1 : 0); }

    await c.env.DB.prepare(
      `UPDATE Interview SET ${sets.join(", ")} WHERE id = ?`
    ).bind(...binds, id).run();

    const interview = await fetchInterviewWithDetails(c.env.DB, id);
    return c.json({ data: interview });
  }
);

interviewsRouter.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM Interview WHERE id = ?")
    .bind(c.req.param("id"))
    .run();
  return c.json({ data: { success: true } });
});

// ============================================
// Interview Questions
// ============================================

interviewsRouter.post(
  "/:interviewId/questions",
  zValidator(
    "json",
    z.object({
      questionText: z.string().min(1),
      category: z.enum(["post_event", "preview", "general"]),
    })
  ),
  async (c) => {
    const interviewId = c.req.param("interviewId");
    const { questionText, category } = c.req.valid("json");
    const now = new Date().toISOString();

    const maxRow = await c.env.DB.prepare(
      "SELECT MAX(sortOrder) AS maxOrder FROM InterviewQuestion WHERE interviewId = ?"
    ).bind(interviewId).first<{ maxOrder: number | null }>();

    const sortOrder = (maxRow?.maxOrder ?? -1) + 1;
    const id = crypto.randomUUID();

    await c.env.DB.prepare(
      "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, interviewId, questionText, category, sortOrder, now, now).run();

    const question = await c.env.DB.prepare(
      "SELECT * FROM InterviewQuestion WHERE id = ?"
    ).bind(id).first();

    return c.json({ data: { ...question, clip: null } });
  }
);

interviewsRouter.patch(
  "/:interviewId/questions/:questionId",
  zValidator("json", z.object({ questionText: z.string().min(1) })),
  async (c) => {
    const questionId = c.req.param("questionId");
    const { questionText } = c.req.valid("json");
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      "UPDATE InterviewQuestion SET questionText = ?, updatedAt = ? WHERE id = ?"
    ).bind(questionText, now, questionId).run();

    const question = await c.env.DB.prepare(
      "SELECT * FROM InterviewQuestion WHERE id = ?"
    ).bind(questionId).first();
    const clip = await c.env.DB.prepare(
      "SELECT * FROM InterviewClip WHERE questionId = ?"
    ).bind(questionId).first();

    return c.json({ data: { ...question, clip: clip ?? null } });
  }
);

interviewsRouter.delete("/:interviewId/questions/:questionId", async (c) => {
  await c.env.DB.prepare("DELETE FROM InterviewQuestion WHERE id = ?")
    .bind(c.req.param("questionId"))
    .run();
  return c.json({ data: { success: true } });
});

// ============================================
// Interview Clips
// ============================================

interviewsRouter.post(
  "/:interviewId/clips",
  zValidator("json", CreateInterviewClipSchema),
  async (c) => {
    const interviewId = c.req.param("interviewId");
    const data = c.req.valid("json");
    const now = new Date().toISOString();
    const clipId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM InterviewClip WHERE questionId = ?"
      ).bind(data.questionId),
      c.env.DB.prepare(
        "INSERT INTO InterviewClip (id, interviewId, questionId, videoUrl, thumbnailUrl, duration, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        clipId,
        interviewId,
        data.questionId,
        data.videoUrl,
        data.thumbnailUrl ?? null,
        data.duration ?? null,
        now
      ),
    ]);

    const batchCounts = await c.env.DB.batch([
      c.env.DB.prepare("SELECT id FROM InterviewQuestion WHERE interviewId = ?").bind(interviewId),
      c.env.DB.prepare("SELECT id FROM InterviewClip WHERE interviewId = ?").bind(interviewId),
    ]);

    const questionCount = (batchCounts[0]?.results ?? []).length;
    const clipCount = (batchCounts[1]?.results ?? []).length;

    if (clipCount === questionCount && questionCount > 0) {
      await c.env.DB.prepare(
        "UPDATE Interview SET status = 'recorded', updatedAt = ? WHERE id = ?"
      ).bind(now, interviewId).run();

      c.executionCtx.waitUntil(
        (async () => {
          try {
            const [interviewRow, configRow] = await Promise.all([
              c.env.DB.prepare(
                "SELECT i.*, u.name AS userName, u.email AS userEmail FROM Interview i JOIN user u ON i.userId = u.id WHERE i.id = ?"
              ).bind(interviewId).first<{ userName: string; userEmail: string }>(),
              c.env.DB.prepare("SELECT data FROM KioskConfig WHERE id = 1").first<{ data: string }>(),
            ]);

            if (!interviewRow) return;

            let rewardText = "";
            if (configRow?.data) {
              try {
                rewardText = (JSON.parse(configRow.data) as { rewardText?: string }).rewardText ?? "";
              } catch { /* ignore */ }
            }
            if (!rewardText) return;

            await sendRewardEmail(c.env, {
              name: (interviewRow as unknown as { userName: string }).userName,
              email: (interviewRow as unknown as { userEmail: string }).userEmail,
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

interviewsRouter.delete("/:interviewId/clips/:clipId", async (c) => {
  await c.env.DB.prepare("DELETE FROM InterviewClip WHERE id = ?")
    .bind(c.req.param("clipId"))
    .run();
  return c.json({ data: { success: true } });
});

export { interviewsRouter };
