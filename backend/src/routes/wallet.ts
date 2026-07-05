import { Hono } from "hono";
import type { Env, AppVariables } from "../env";

const walletRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// GET /api/wallet/coupons — all coupons for the signed-in user across every org
walletRouter.get("/coupons", async (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);

  const now = new Date().toISOString();

  const rows = await c.env.DB.prepare(
    `SELECT c.id, c.code, c.rewardText, c.expiresAt, c.redeemedAt, c.createdAt,
            o.id AS orgId, o.name AS orgName, o.slug AS orgSlug,
            k.data AS kioskData
     FROM Coupon c
     JOIN Organization o ON c.organizationId = o.id
     LEFT JOIN OrgKioskConfig k ON k.organizationId = o.id
     WHERE c.userId = ?
     ORDER BY c.createdAt DESC`
  ).bind(user.id).all<{
    id: string; code: string; rewardText: string; expiresAt: string;
    redeemedAt: string | null; createdAt: string;
    orgId: string; orgName: string; orgSlug: string;
    kioskData: string | null;
  }>();

  const coupons = (rows.results ?? []).map((r) => {
    let logoImage: string | null = null;
    if (r.kioskData) {
      try {
        const cfg = JSON.parse(r.kioskData) as { logoImage?: string };
        logoImage = cfg.logoImage ?? null;
      } catch { /* ignore */ }
    }
    return {
      id: r.id,
      code: r.code,
      rewardText: r.rewardText,
      expiresAt: r.expiresAt,
      redeemedAt: r.redeemedAt,
      createdAt: r.createdAt,
      status: r.redeemedAt ? "redeemed" : r.expiresAt < now ? "expired" : "valid",
      business: {
        id: r.orgId,
        name: r.orgName,
        slug: r.orgSlug,
        logoImage,
      },
    };
  });

  return c.json({ data: coupons });
});

export { walletRouter };
