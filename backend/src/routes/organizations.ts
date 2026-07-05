import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, AppVariables } from "../env";
import type { DbOrganization, DbOrgKioskConfig } from "../lib/db";

const organizationsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

organizationsRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { name, slug } = c.req.valid("json");
    const now = new Date().toISOString();

    const existing = await c.env.DB.prepare(
      "SELECT id FROM Organization WHERE slug = ?"
    ).bind(slug).first();
    if (existing) {
      return c.json({ error: { message: "Slug already taken", code: "SLUG_TAKEN" } }, 409);
    }

    const orgId = crypto.randomUUID();
    const memberId = crypto.randomUUID();
    const configId = crypto.randomUUID();

    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO Organization (id, name, slug, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)"
      ).bind(orgId, name, slug, now, now),
      c.env.DB.prepare(
        "INSERT INTO OrgMember (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, 'owner', ?)"
      ).bind(memberId, orgId, user.id, now),
      c.env.DB.prepare(
        "INSERT INTO OrgKioskConfig (id, organizationId, data, updatedAt) VALUES (?, ?, '{}', ?)"
      ).bind(configId, orgId, now),
    ]);

    const [org, kioskConfig, members] = await Promise.all([
      c.env.DB.prepare("SELECT * FROM Organization WHERE id = ?").bind(orgId).first<DbOrganization>(),
      c.env.DB.prepare("SELECT * FROM OrgKioskConfig WHERE organizationId = ?").bind(orgId).first<DbOrgKioskConfig>(),
      c.env.DB.prepare("SELECT * FROM OrgMember WHERE organizationId = ?").bind(orgId).all(),
    ]);

    return c.json({ data: { ...org, kioskConfig, members: members.results ?? [] } });
  }
);

// PATCH /api/organizations/:id — owner-only, rename business
organizationsRouter.patch(
  "/:id",
  zValidator("json", z.object({ name: z.string().min(1) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const orgId = c.req.param("id");
    const { name } = c.req.valid("json");

    const membership = await c.env.DB.prepare(
      "SELECT role FROM OrgMember WHERE organizationId = ? AND userId = ?"
    ).bind(orgId, user.id).first<{ role: string }>();

    if (!membership || membership.role !== "owner") {
      return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
    }

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "UPDATE Organization SET name = ?, updatedAt = ? WHERE id = ?"
    ).bind(name, now, orgId).run();

    const org = await c.env.DB.prepare(
      "SELECT * FROM Organization WHERE id = ?"
    ).bind(orgId).first<DbOrganization>();

    return c.json({ data: org });
  }
);

// DELETE /api/organizations/:id — owner-only, cascades all data
organizationsRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const orgId = c.req.param("id");

  // Confirm caller is owner of this org
  const membership = await c.env.DB.prepare(
    "SELECT role FROM OrgMember WHERE organizationId = ? AND userId = ?"
  ).bind(orgId, user.id).first<{ role: string }>();

  if (!membership || membership.role !== "owner") {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  // Cascade: clips → questions → interviews, then config, members, org
  const interviews = await c.env.DB.prepare(
    "SELECT id FROM Interview WHERE organizationId = ?"
  ).bind(orgId).all<{ id: string }>();

  const interviewIds = (interviews.results ?? []).map((r) => r.id);

  const deleteOps = [];

  // Delete clips and questions for each interview
  for (const interviewId of interviewIds) {
    deleteOps.push(
      c.env.DB.prepare("DELETE FROM InterviewClip WHERE interviewId = ?").bind(interviewId),
      c.env.DB.prepare("DELETE FROM InterviewQuestion WHERE interviewId = ?").bind(interviewId)
    );
  }

  // Delete all interviews, kiosk config, members, and the org itself
  deleteOps.push(
    c.env.DB.prepare("DELETE FROM Interview WHERE organizationId = ?").bind(orgId),
    c.env.DB.prepare("DELETE FROM OrgKioskConfig WHERE organizationId = ?").bind(orgId),
    c.env.DB.prepare("DELETE FROM OrgMember WHERE organizationId = ?").bind(orgId),
    c.env.DB.prepare("DELETE FROM Organization WHERE id = ?").bind(orgId)
  );

  await c.env.DB.batch(deleteOps);

  return c.json({ data: { success: true } });
});

organizationsRouter.get("/mine", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.body(null, 401);
  }

  const { results: memberships } = await c.env.DB.prepare(
    `SELECT o.*, m.role, k.id AS kId, k.data AS kData, k.updatedAt AS kUpdatedAt
     FROM OrgMember m
     JOIN Organization o ON o.id = m.organizationId
     LEFT JOIN OrgKioskConfig k ON k.organizationId = o.id
     WHERE m.userId = ?`
  ).bind(user.id).all<DbOrganization & { role: string; kId: string | null; kData: string | null; kUpdatedAt: string | null }>();

  return c.json({
    data: (memberships ?? []).map((o) => ({
      id: o.id, name: o.name, slug: o.slug, role: o.role, createdAt: o.createdAt, updatedAt: o.updatedAt,
      kioskConfig: o.kId ? { id: o.kId, organizationId: o.id, data: o.kData, updatedAt: o.kUpdatedAt } : null,
    })),
  });
});

export { organizationsRouter };
