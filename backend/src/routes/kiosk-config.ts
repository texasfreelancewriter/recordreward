import { Hono } from "hono";
import type { Env, AppVariables } from "../env";

const kioskConfigRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

async function resolveOrgId(
  db: D1Database,
  userId: string | undefined,
  queryOrgId: string | undefined
): Promise<string | null> {
  if (queryOrgId) return queryOrgId;

  if (userId) {
    const row = await db
      .prepare("SELECT organizationId FROM OrgMember WHERE userId = ? LIMIT 1")
      .bind(userId)
      .first<{ organizationId: string }>();
    return row?.organizationId ?? null;
  }

  const row = await db
    .prepare("SELECT id FROM Organization LIMIT 1")
    .first<{ id: string }>();
  return row?.id ?? null;
}

kioskConfigRouter.get("/", async (c) => {
  const user = c.get("user");
  const orgId = await resolveOrgId(
    c.env.DB,
    user?.id,
    c.req.query("orgId")
  );
  if (!orgId) return c.json({ data: null });

  const config = await c.env.DB.prepare(
    "SELECT data FROM OrgKioskConfig WHERE organizationId = ?"
  ).bind(orgId).first<{ data: string }>();

  return c.json({ data: config ? JSON.parse(config.data) : null });
});

kioskConfigRouter.put("/", async (c) => {
  const user = c.get("user");
  const orgId = await resolveOrgId(
    c.env.DB,
    user?.id,
    c.req.query("orgId")
  );
  if (!orgId) {
    return c.json({ error: { message: "No organization found", code: "NO_ORG" } }, 404);
  }

  const body = await c.req.json();
  const now = new Date().toISOString();

  const existing = await c.env.DB.prepare(
    "SELECT id FROM OrgKioskConfig WHERE organizationId = ?"
  ).bind(orgId).first();

  if (existing) {
    await c.env.DB.prepare(
      "UPDATE OrgKioskConfig SET data = ?, updatedAt = ? WHERE organizationId = ?"
    ).bind(JSON.stringify(body), now, orgId).run();
  } else {
    await c.env.DB.prepare(
      "INSERT INTO OrgKioskConfig (id, organizationId, data, updatedAt) VALUES (?, ?, ?, ?)"
    ).bind(crypto.randomUUID(), orgId, JSON.stringify(body), now).run();
  }

  return c.json({ data: true });
});

export { kioskConfigRouter };
