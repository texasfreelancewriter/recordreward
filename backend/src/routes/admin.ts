import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateUserSchema } from "../types";
import type { Env, AppVariables } from "../env";
import type { DbUser } from "../lib/db";

const adminRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

adminRouter.post(
  "/users",
  zValidator("json", CreateUserSchema),
  async (c) => {
    const { name, email } = c.req.valid("json");

    const existing = await c.env.DB.prepare(
      "SELECT id FROM user WHERE email = ?"
    ).bind(email).first();
    if (existing) {
      return c.json(
        { error: { message: "Email already exists", code: "EMAIL_EXISTS" } },
        400
      );
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      "INSERT INTO user (id, name, email, emailVerified, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?)"
    ).bind(id, name, email, now, now).run();

    const user = await c.env.DB.prepare(
      "SELECT id, name, email, image FROM user WHERE id = ?"
    ).bind(id).first<{ id: string; name: string; email: string; image: string | null }>();

    return c.json({ data: user });
  }
);

adminRouter.get("/users", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, email, image, createdAt FROM user ORDER BY createdAt DESC"
  ).all<DbUser>();

  return c.json({ data: results ?? [] });
});

export { adminRouter };
