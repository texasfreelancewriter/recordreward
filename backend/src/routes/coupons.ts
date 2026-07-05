import { Hono } from "hono";
import type { Env, AppVariables } from "../env";

const couponsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

type CouponRow = {
  id: string;
  code: string;
  organizationId: string;
  interviewId: string;
  userId: string;
  rewardText: string;
  expiresAt: string;
  redeemedAt: string | null;
  createdAt: string;
  userName: string;
};

// GET /api/coupons — list all coupons for the org (dashboard)
couponsRouter.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  const orgId = c.req.query("orgId");
  if (!orgId) return c.json({ error: { message: "orgId required", code: "BAD_REQUEST" } }, 400);

  const membership = await c.env.DB.prepare(
    "SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?"
  ).bind(user.id, orgId).first();

  if (!membership) return c.json({ error: { message: "Not authorized", code: "FORBIDDEN" } }, 403);

  const now = new Date().toISOString();

  const rows = await c.env.DB.prepare(
    `SELECT c.id, c.code, c.rewardText, c.expiresAt, c.redeemedAt, c.createdAt, u.name AS customerName
     FROM Coupon c JOIN "user" u ON c.userId = u.id
     WHERE c.organizationId = ?
     ORDER BY c.createdAt DESC`
  ).bind(orgId).all<{
    id: string; code: string; rewardText: string; expiresAt: string;
    redeemedAt: string | null; createdAt: string; customerName: string;
  }>();

  const coupons = (rows.results ?? []).map((r) => ({
    ...r,
    status: r.redeemedAt ? "redeemed" : r.expiresAt < now ? "expired" : "valid",
  }));

  const total = coupons.length;
  const redeemed = coupons.filter((c) => c.status === "redeemed").length;
  const expired = coupons.filter((c) => c.status === "expired").length;
  const valid = coupons.filter((c) => c.status === "valid").length;

  return c.json({ data: { coupons, stats: { total, redeemed, expired, valid } } });
});

// GET /api/coupons/:code — look up a coupon (business POS scan)
couponsRouter.get("/:code", async (c) => {
  const code = c.req.param("code").toUpperCase();

  const row = await c.env.DB.prepare(
    `SELECT c.*, u.name AS userName
     FROM Coupon c JOIN "user" u ON c.userId = u.id
     WHERE c.code = ?`
  ).bind(code).first<CouponRow>();

  if (!row) {
    return c.json({ error: { message: "Coupon not found", code: "NOT_FOUND" } }, 404);
  }

  const now = new Date().toISOString();
  const status =
    row.redeemedAt ? "redeemed"
    : row.expiresAt < now ? "expired"
    : "valid";

  return c.json({
    data: {
      code: row.code,
      rewardText: row.rewardText,
      expiresAt: row.expiresAt,
      redeemedAt: row.redeemedAt,
      createdAt: row.createdAt,
      customerName: row.userName,
      status,
    },
  });
});

// POST /api/coupons/:code/redeem — mark a coupon as redeemed (authenticated)
couponsRouter.post("/:code/redeem", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  const code = c.req.param("code").toUpperCase();
  const now = new Date().toISOString();

  const row = await c.env.DB.prepare(
    `SELECT c.id, c.organizationId, c.expiresAt, c.redeemedAt
     FROM Coupon c
     WHERE c.code = ?`
  ).bind(code).first<{
    id: string; organizationId: string; expiresAt: string; redeemedAt: string | null;
  }>();

  if (!row) {
    return c.json({ error: { message: "Coupon not found", code: "NOT_FOUND" } }, 404);
  }

  if (row.redeemedAt) {
    return c.json({ error: { message: "Coupon already redeemed", code: "ALREADY_REDEEMED" } }, 409);
  }

  if (row.expiresAt < now) {
    return c.json({ error: { message: "Coupon has expired", code: "EXPIRED" } }, 410);
  }

  // Verify the redeemer belongs to the org that issued the coupon
  const membership = await c.env.DB.prepare(
    "SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?"
  ).bind(user.id, row.organizationId).first();

  if (!membership) {
    return c.json({ error: { message: "Not authorized for this coupon", code: "FORBIDDEN" } }, 403);
  }

  await c.env.DB.prepare(
    "UPDATE Coupon SET redeemedAt = ? WHERE id = ?"
  ).bind(now, row.id).run();

  return c.json({ data: { success: true, redeemedAt: now } });
});

export { couponsRouter };
