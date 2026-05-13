import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";
import {
  identifyStarsAndGenerateQuestions,
  generateRecapStory,
  type PlayerProfile,
} from "../lib/claude";
import { fetchESPNGameData } from "../lib/espn";

const gameSessionsRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

// ── List game sessions ──────────────────────────────────────────────────────

gameSessionsRouter.get("/", async (c) => {
  const orgId = c.req.query("orgId");
  const where = orgId ? "WHERE organizationId = ?" : "";
  const binds = orgId ? [orgId] : [];

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM GameSession ${where} ORDER BY gameDate DESC`
  )
    .bind(...binds)
    .all();

  return c.json({ data: results ?? [] });
});

// ── Get single game session with its interviews ─────────────────────────────

gameSessionsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");

  const session = await c.env.DB.prepare(
    "SELECT * FROM GameSession WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!session) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  const { results: interviews } = await c.env.DB.prepare(
    `SELECT i.*, u.name AS userName, u.email AS userEmail
     FROM Interview i
     JOIN user u ON i.userId = u.id
     WHERE i.gameSessionId = ?
     ORDER BY i.createdAt ASC`
  )
    .bind(id)
    .all();

  return c.json({ data: { ...session, interviews: interviews ?? [] } });
});

// ── Create game session ─────────────────────────────────────────────────────

gameSessionsRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      organizationId: z.string().optional(),
      sport: z.string().default("basketball"),
      homeTeam: z.string().min(1),
      awayTeam: z.string().min(1),
      gameDate: z.string().min(1),
    })
  ),
  async (c) => {
    const data = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO GameSession (id, organizationId, sport, homeTeam, awayTeam, gameDate, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(
        id,
        data.organizationId ?? null,
        data.sport,
        data.homeTeam,
        data.awayTeam,
        data.gameDate,
        now,
        now
      )
      .run();

    const session = await c.env.DB.prepare(
      "SELECT * FROM GameSession WHERE id = ?"
    )
      .bind(id)
      .first();

    return c.json({ data: session });
  }
);

// ── Analyze transcript → identify stars → create interviews ─────────────────

gameSessionsRouter.post(
  "/:id/analyze",
  zValidator(
    "json",
    z.object({
      transcript: z.string().min(50),
      deadlineHours: z.number().default(2),
      extraContext: z.string().optional(),
    })
  ),
  async (c) => {
    const sessionId = c.req.param("id");
    const { transcript, deadlineHours, extraContext } = c.req.valid("json");

    const session = await c.env.DB.prepare(
      "SELECT * FROM GameSession WHERE id = ?"
    )
      .bind(sessionId)
      .first<{
        id: string;
        sport: string;
        homeTeam: string;
        awayTeam: string;
        gameDate: string;
        organizationId: string | null;
      }>();

    if (!session) {
      return c.json(
        { error: { message: "Not found", code: "NOT_FOUND" } },
        404
      );
    }

    const gameContext = `${session.awayTeam} at ${session.homeTeam} on ${session.gameDate}`;

    // Load roster for both teams so Claude gets correct spellings and bios
    const { results: playerRows } = await c.env.DB.prepare(
      `SELECT * FROM Player WHERE team = ? OR team = ?`
    )
      .bind(session.homeTeam, session.awayTeam)
      .all();

    const players: PlayerProfile[] = (playerRows ?? []).map((r) => ({
      name: r.name as string,
      jerseyNumber: r.jerseyNumber as string | null,
      position: r.position as string | null,
      team: r.team as string,
      age: r.age as number | null,
      hometown: r.hometown as string | null,
      yearsWithTeam: r.yearsWithTeam as number | null,
      yearsInLeague: r.yearsInLeague as number | null,
      bio: r.bio as string | null,
      stats: safeJson(r.statsJson as string, {}),
      references: safeJson(r.referencesJson as string, []),
    }));

    // Auto-fetch ESPN box score for cross-checking (silent — never blocks analysis)
    let espnResult = { found: false, source: "", summary: "" };
    try {
      espnResult = await fetchESPNGameData(session.sport, session.homeTeam, session.awayTeam, session.gameDate);
    } catch { /* ESPN unavailable — continue without it */ }

    const { stars, questions } = await identifyStarsAndGenerateQuestions(
      transcript,
      session.sport,
      gameContext,
      c.env.ANTHROPIC_API_KEY,
      players,
      espnResult.summary,
      extraContext ?? ""
    );

    const deadline = new Date(
      Date.now() + deadlineHours * 60 * 60 * 1000
    ).toISOString();
    const now = new Date().toISOString();

    // Save transcript + update status
    await c.env.DB.prepare(
      `UPDATE GameSession SET transcript = ?, extraContext = ?, espnData = ?, status = 'analyzed', deadline = ?, updatedAt = ? WHERE id = ?`
    )
      .bind(transcript, extraContext ?? null, espnResult.found ? espnResult.summary : null, deadline, now, sessionId)
      .run();

    // Create one interview per star/coach with their AI questions
    const createdInterviews = [];

    for (const star of stars) {
      const personQuestions =
        questions.find((q) => q.personName === star.name)?.questions ?? [];
      if (personQuestions.length === 0) continue;

      // Find or create a user record for this person
      const guestEmail = `${star.name
        .toLowerCase()
        .replace(/\s+/g, ".")}@sid.guest`;
      let user = await c.env.DB.prepare(
        "SELECT id FROM user WHERE email = ?"
      )
        .bind(guestEmail)
        .first<{ id: string }>();

      if (!user) {
        const userId = crypto.randomUUID();
        await c.env.DB.prepare(
          "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)"
        )
          .bind(userId, star.name, guestEmail, now, now)
          .run();
        user = { id: userId };
      }

      const interviewId = crypto.randomUUID();
      const questionInserts = personQuestions.map((qText, i) =>
        c.env.DB.prepare(
          "INSERT INTO InterviewQuestion (id, interviewId, questionText, category, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          crypto.randomUUID(),
          interviewId,
          qText,
          "post_event",
          i,
          now,
          now
        )
      );

      await c.env.DB.batch([
        c.env.DB.prepare(
          `INSERT INTO Interview (id, userId, organizationId, gameSessionId, title, spreadClips, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)`
        ).bind(
          interviewId,
          user.id,
          session.organizationId ?? null,
          sessionId,
          `${star.name} — ${gameContext}`,
          now,
          now
        ),
        ...questionInserts,
      ]);

      createdInterviews.push({
        interviewId,
        personName: star.name,
        role: star.role,
        stats: star.stats,
        reason: star.reason,
      });
    }

    return c.json({
      data: {
        stars,
        interviews: createdInterviews,
        deadline,
      },
    });
  }
);

// ── Generate recap story from completed interviews ──────────────────────────

gameSessionsRouter.post("/:id/generate-recap", async (c) => {
  const sessionId = c.req.param("id");

  const session = await c.env.DB.prepare(
    "SELECT * FROM GameSession WHERE id = ?"
  )
    .bind(sessionId)
    .first<{
      id: string;
      sport: string;
      homeTeam: string;
      awayTeam: string;
      gameDate: string;
      transcript: string | null;
      extraContext: string | null;
      espnData: string | null;
    }>();

  if (!session) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  if (!session.transcript) {
    return c.json(
      { error: { message: "No transcript — run /analyze first", code: "NO_TRANSCRIPT" } },
      400
    );
  }

  // Collect all recorded clips with their questions and athlete names
  const { results: clips } = await c.env.DB.prepare(
    `SELECT ic.videoUrl, ic.duration, iq.questionText, u.name AS userName, i.title
     FROM InterviewClip ic
     JOIN InterviewQuestion iq ON ic.questionId = iq.id
     JOIN Interview i ON ic.interviewId = i.id
     JOIN user u ON i.userId = u.id
     WHERE i.gameSessionId = ?`
  )
    .bind(sessionId)
    .all<{
      videoUrl: string;
      duration: number | null;
      questionText: string;
      userName: string;
    }>();

  if (!clips || clips.length === 0) {
    return c.json(
      { error: { message: "No recorded clips yet", code: "NO_CLIPS" } },
      400
    );
  }

  // Load player roster so recap uses correct spellings and reference aliases
  const { results: playerRows } = await c.env.DB.prepare(
    `SELECT * FROM Player WHERE team = ? OR team = ?`
  )
    .bind(session.homeTeam, session.awayTeam)
    .all();

  const players: PlayerProfile[] = (playerRows ?? []).map((r) => ({
    name: r.name as string,
    jerseyNumber: r.jerseyNumber as string | null,
    position: r.position as string | null,
    team: r.team as string,
    age: r.age as number | null,
    hometown: r.hometown as string | null,
    yearsWithTeam: r.yearsWithTeam as number | null,
    yearsInLeague: r.yearsInLeague as number | null,
    bio: r.bio as string | null,
    stats: safeJson(r.statsJson as string, {}),
    references: safeJson(r.referencesJson as string, []),
  }));

  const quotes = clips.map((clip) => ({
    personName: clip.userName,
    role: "athlete",
    question: clip.questionText,
    answer: `[Video response — ${clip.duration ? `${clip.duration}s` : "recorded"}]`,
  }));

  const recap = await generateRecapStory(
    session.transcript,
    quotes,
    {
      homeTeam: session.homeTeam,
      awayTeam: session.awayTeam,
      sport: session.sport,
      gameDate: session.gameDate,
    },
    c.env.ANTHROPIC_API_KEY,
    players,
    session.espnData ?? "",
    session.extraContext ?? ""
  );

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    "UPDATE GameSession SET recapStory = ?, status = 'recap_ready', updatedAt = ? WHERE id = ?"
  )
    .bind(recap, now, sessionId)
    .run();

  return c.json({ data: { recap } });
});

// ── Delete game session ─────────────────────────────────────────────────────

gameSessionsRouter.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM GameSession WHERE id = ?")
    .bind(c.req.param("id"))
    .run();
  return c.json({ data: { success: true } });
});

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

export { gameSessionsRouter };
