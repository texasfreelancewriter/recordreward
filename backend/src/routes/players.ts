import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";

const playersRouter = new Hono<{
  Bindings: Env;
  Variables: AppVariables;
}>();

const PlayerSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1),
  jerseyNumber: z.string().optional(),
  position: z.string().optional(),
  sport: z.string().default("baseball"),
  team: z.string().min(1),
  age: z.number().int().optional(),
  hometown: z.string().optional(),
  yearsWithTeam: z.number().int().optional(),
  yearsInLeague: z.number().int().optional(),
  bio: z.string().optional(),
  stats: z.record(z.string(), z.string()).default({}),
  references: z.array(z.string()).default([]),
});

playersRouter.get("/", async (c) => {
  const orgId = c.req.query("orgId");
  const team = c.req.query("team");

  const conditions: string[] = [];
  const binds: unknown[] = [];

  if (orgId) { conditions.push("organizationId = ?"); binds.push(orgId); }
  if (team) { conditions.push("team = ?"); binds.push(team); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM Player ${where} ORDER BY team ASC, CAST(jerseyNumber AS INTEGER) ASC, name ASC`
  )
    .bind(...binds)
    .all();

  const players = (results ?? []).map(parsePlayer);
  return c.json({ data: players });
});

playersRouter.get("/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT * FROM Player WHERE id = ?")
    .bind(c.req.param("id"))
    .first();

  if (!row) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  return c.json({ data: parsePlayer(row) });
});

playersRouter.post(
  "/",
  zValidator("json", PlayerSchema),
  async (c) => {
    const data = c.req.valid("json");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO Player (id, organizationId, name, jerseyNumber, position, sport, team, age, hometown, yearsWithTeam, yearsInLeague, bio, statsJson, referencesJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        data.organizationId ?? null,
        data.name,
        data.jerseyNumber ?? null,
        data.position ?? null,
        data.sport,
        data.team,
        data.age ?? null,
        data.hometown ?? null,
        data.yearsWithTeam ?? null,
        data.yearsInLeague ?? null,
        data.bio ?? null,
        JSON.stringify(data.stats),
        JSON.stringify(data.references),
        now,
        now
      )
      .run();

    const row = await c.env.DB.prepare("SELECT * FROM Player WHERE id = ?").bind(id).first();
    return c.json({ data: parsePlayer(row!) });
  }
);

playersRouter.put(
  "/:id",
  zValidator("json", PlayerSchema.partial()),
  async (c) => {
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const now = new Date().toISOString();

    const existing = await c.env.DB.prepare("SELECT * FROM Player WHERE id = ?").bind(id).first();
    if (!existing) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

    const merged = { ...parsePlayer(existing), ...data };

    await c.env.DB.prepare(
      `UPDATE Player SET name=?, jerseyNumber=?, position=?, sport=?, team=?, age=?, hometown=?, yearsWithTeam=?, yearsInLeague=?, bio=?, statsJson=?, referencesJson=?, updatedAt=? WHERE id=?`
    )
      .bind(
        merged.name,
        merged.jerseyNumber ?? null,
        merged.position ?? null,
        merged.sport,
        merged.team,
        merged.age ?? null,
        merged.hometown ?? null,
        merged.yearsWithTeam ?? null,
        merged.yearsInLeague ?? null,
        merged.bio ?? null,
        JSON.stringify(merged.stats),
        JSON.stringify(merged.references),
        now,
        id
      )
      .run();

    const row = await c.env.DB.prepare("SELECT * FROM Player WHERE id = ?").bind(id).first();
    return c.json({ data: parsePlayer(row!) });
  }
);

playersRouter.delete("/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM Player WHERE id = ?").bind(c.req.param("id")).run();
  return c.json({ data: { success: true } });
});

function parsePlayer(row: Record<string, unknown>) {
  return {
    ...row,
    stats: safeJson(row.statsJson as string, {}),
    references: safeJson(row.referencesJson as string, []),
  };
}

function safeJson<T>(str: string | null | undefined, fallback: T): T {
  try { return str ? JSON.parse(str) : fallback; } catch { return fallback; }
}

export { playersRouter };
