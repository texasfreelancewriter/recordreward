import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import type { Env, AppVariables } from "../env";

const commercialsRouter = new Hono<{ Bindings: Env; Variables: AppVariables }>();

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DbTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  suggestedMusic: string;
  captionTone: string;
  createdAt: string;
  updatedAt: string;
}

interface DbShot {
  id: string;
  templateId: string;
  order: number;
  title: string;
  instruction: string;
  suggestedDuration: number;
  required: number;
  cameraDirection: string;
}

interface DbProject {
  id: string;
  organizationId: string;
  templateId: string;
  businessName: string;
  location: string;
  tagline: string;
  logoUrl: string | null;
  website: string;
  instagramHandle: string;
  facebookPage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface DbAsset {
  id: string;
  projectId: string;
  shotId: string;
  url: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  notes: string;
  createdAt: string;
}

interface DbPlan {
  id: string;
  projectId: string;
  planJson: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function requireAuth(c: { get: (k: string) => unknown }) {
  const user = c.get("user") as { id: string } | null;
  if (!user) throw new Error("Unauthorized");
  return user;
}

async function orgIdForUser(db: D1Database, userId: string, queryOrgId?: string): Promise<string | null> {
  if (queryOrgId) {
    const member = await db
      .prepare("SELECT organizationId FROM OrgMember WHERE userId = ? AND organizationId = ?")
      .bind(userId, queryOrgId)
      .first<{ organizationId: string }>();
    return member?.organizationId ?? null;
  }
  const row = await db
    .prepare("SELECT organizationId FROM OrgMember WHERE userId = ? LIMIT 1")
    .bind(userId)
    .first<{ organizationId: string }>();
  return row?.organizationId ?? null;
}

function buildVideoPlan(
  project: DbProject,
  template: DbTemplate,
  shots: DbShot[],
  assets: DbAsset[]
) {
  const assetsByShot = new Map(assets.map((a) => [a.shotId, a]));

  const selectedAssets = shots
    .map((shot, i) => {
      const asset = assetsByShot.get(shot.id);
      if (!asset) return null;
      return {
        order: i + 1,
        shotId: shot.id,
        shotTitle: shot.title,
        assetId: asset.id,
        assetUrl: asset.url,
        durationSeconds: shot.suggestedDuration,
        transitionType: i === shots.length - 1 ? "fade_to_black" : "cut",
      };
    })
    .filter(Boolean);

  const totalDuration = selectedAssets.reduce((s, a) => s + (a?.durationSeconds ?? 0), 0);
  const taglineTime = Math.max(0, totalDuration - 9);
  const ctaTime = Math.max(0, totalDuration - 4);

  const shotList = selectedAssets.map((a) => a!.shotTitle).join(", ");
  const base30 = `Create a polished 30-second commercial for ${project.businessName}, a ${template.name} in ${project.location}. Use the uploaded assets in this sequence: ${shotList}. Make it energetic and social-media friendly — vertical 1080×1920 format (Instagram Reels / TikTok / YouTube Shorts). Use quick cuts (2–3 seconds each), ${template.suggestedMusic}, warm color grading, and animated captions in a ${template.captionTone} tone. End with the logo and tagline: "${project.tagline}".${project.website ? ` Include a call-to-action card showing: ${project.website}.` : ""}${project.instagramHandle ? ` Social: @${project.instagramHandle}.` : ""}`;
  const base60 = `Create a polished 60-second cinematic commercial for ${project.businessName}, a ${template.name} in ${project.location}. Use the uploaded assets in this sequence: ${shotList}. Make it cinematic — horizontal 1920×1080 format. Use slower pacing (4–6 seconds per shot), atmospheric cross-dissolve transitions, ${template.suggestedMusic}, rich warm color grading, and an emotional storytelling arc. Feature the tagline "${project.tagline}" as a centered title card near the end, followed by the logo.${project.website ? ` Close with a full-screen call-to-action: ${project.website}.` : ""}`;

  return {
    id: `plan_${Date.now()}`,
    projectId: project.id,
    templateName: template.name,
    businessName: project.businessName,
    location: project.location,
    tagline: project.tagline,
    selectedAssets,
    textOverlays: [
      { text: project.businessName, timingSeconds: 1, durationSeconds: 3, position: "bottom", style: "bold white 48px with drop shadow" },
      ...(project.tagline ? [{ text: project.tagline, timingSeconds: taglineTime, durationSeconds: 4, position: "center", style: "italic white 36px with drop shadow" }] : []),
      ...(project.website ? [{ text: project.website, timingSeconds: ctaTime, durationSeconds: 3, position: "bottom", style: "regular white 24px semi-transparent" }] : []),
    ],
    logoPlacement: { timingSeconds: ctaTime, position: "center", durationSeconds: 5 },
    captionScript: [
      project.businessName,
      ...(project.tagline ? [project.tagline] : []),
      ...(project.location ? [project.location] : []),
      ...(project.website ? [project.website] : []),
    ],
    musicStyle: template.suggestedMusic,
    outputPlans: [
      { format: "30-Second Vertical (Reel/TikTok)", durationSeconds: 30, width: 1080, height: 1920, aiPrompt: base30 },
      { format: "60-Second Cinematic", durationSeconds: 60, width: 1920, height: 1080, aiPrompt: base60 },
    ],
    status: "ready",
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

commercialsRouter.get("/templates", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM CommercialTemplate ORDER BY name ASC"
  ).all<DbTemplate>();

  const templates = await Promise.all(
    (results ?? []).map(async (t) => {
      const { results: shots } = await c.env.DB.prepare(
        'SELECT * FROM CommercialTemplateShot WHERE templateId = ? ORDER BY "order" ASC'
      ).bind(t.id).all<DbShot>();
      return { ...t, shots: (shots ?? []).map((s) => ({ ...s, required: s.required === 1 })) };
    })
  );

  return c.json({ data: templates });
});

commercialsRouter.get("/templates/:id", async (c) => {
  const id = c.req.param("id");
  const template = await c.env.DB.prepare(
    "SELECT * FROM CommercialTemplate WHERE id = ?"
  ).bind(id).first<DbTemplate>();
  if (!template) return c.json({ error: { message: "Not found" } }, 404);

  const { results: shots } = await c.env.DB.prepare(
    'SELECT * FROM CommercialTemplateShot WHERE templateId = ? ORDER BY "order" ASC'
  ).bind(id).all<DbShot>();

  return c.json({ data: { ...template, shots: (shots ?? []).map((s) => ({ ...s, required: s.required === 1 })) } });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

const CreateProjectSchema = z.object({
  templateId: z.string(),
  businessName: z.string().min(1),
  location: z.string().default(""),
  tagline: z.string().default(""),
  website: z.string().default(""),
  instagramHandle: z.string().default(""),
  facebookPage: z.string().default(""),
  orgId: z.string().optional(),
});

commercialsRouter.get("/projects", async (c) => {
  const user = requireAuth(c);
  const orgId = await orgIdForUser(c.env.DB, user.id, c.req.query("orgId") ?? undefined);
  if (!orgId) return c.json({ data: [] });

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM CommercialProject WHERE organizationId = ? ORDER BY createdAt DESC"
  ).bind(orgId).all<DbProject>();

  return c.json({ data: results ?? [] });
});

commercialsRouter.post("/projects", zValidator("json", CreateProjectSchema), async (c) => {
  const user = requireAuth(c);
  const body = c.req.valid("json");
  const orgId = await orgIdForUser(c.env.DB, user.id, body.orgId);
  if (!orgId) return c.json({ error: { message: "No organization found" } }, 400);

  const id = `proj_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO CommercialProject (id,organizationId,templateId,businessName,location,tagline,website,instagramHandle,facebookPage,status,createdAt,updatedAt)
     VALUES (?,?,?,?,?,?,?,?,?,'draft',?,?)`
  ).bind(id, orgId, body.templateId, body.businessName, body.location, body.tagline, body.website, body.instagramHandle, body.facebookPage, now, now).run();

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(id).first<DbProject>();
  return c.json({ data: project }, 201);
});

commercialsRouter.get("/projects/:id", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(id).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  // Verify user has access
  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  const template = await c.env.DB.prepare("SELECT * FROM CommercialTemplate WHERE id = ?").bind(project.templateId).first<DbTemplate>();
  const { results: shots } = await c.env.DB.prepare(
    'SELECT * FROM CommercialTemplateShot WHERE templateId = ? ORDER BY "order" ASC'
  ).bind(project.templateId).all<DbShot>();
  const { results: assets } = await c.env.DB.prepare(
    "SELECT * FROM CommercialAsset WHERE projectId = ? ORDER BY createdAt ASC"
  ).bind(id).all<DbAsset>();
  const planRow = await c.env.DB.prepare("SELECT * FROM CommercialVideoPlan WHERE projectId = ?").bind(id).first<DbPlan>();

  return c.json({
    data: {
      project,
      template: template ? { ...template, shots: (shots ?? []).map((s) => ({ ...s, required: s.required === 1 })) } : null,
      assets: assets ?? [],
      plan: planRow ? JSON.parse(planRow.planJson) : null,
    },
  });
});

const UpdateProjectSchema = z.object({
  businessName: z.string().min(1).optional(),
  location: z.string().optional(),
  tagline: z.string().optional(),
  website: z.string().optional(),
  instagramHandle: z.string().optional(),
  facebookPage: z.string().optional(),
  status: z.string().optional(),
});

commercialsRouter.patch("/projects/:id", zValidator("json", UpdateProjectSchema), async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(id).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  const now = new Date().toISOString();
  const fields = Object.entries(body)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `"${k}" = ?`).join(", ");
  const values = Object.values(body).filter((v) => v !== undefined);

  if (fields) {
    await c.env.DB.prepare(`UPDATE CommercialProject SET ${fields}, updatedAt = ? WHERE id = ?`)
      .bind(...values, now, id).run();
  }

  const updated = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(id).first<DbProject>();
  return c.json({ data: updated });
});

commercialsRouter.delete("/projects/:id", async (c) => {
  const user = requireAuth(c);
  const id = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(id).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  await c.env.DB.prepare("DELETE FROM CommercialProject WHERE id = ?").bind(id).run();
  return c.json({ data: { success: true } });
});

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

commercialsRouter.post("/projects/:id/assets", async (c) => {
  const user = requireAuth(c);
  const projectId = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(projectId).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  const formData = await c.req.formData();
  const file = formData.get("file") as unknown as File | null;
  const shotId = formData.get("shotId") as string | null;
  const notes = (formData.get("notes") as string | null) ?? "";

  if (!file || typeof file === "string") return c.json({ error: { message: "No file" } }, 400);
  if (!shotId) return c.json({ error: { message: "shotId required" } }, 400);

  const ext = (file as File).name?.split(".").pop() ?? "jpg";
  const key = `commercial-${projectId}-${shotId}-${crypto.randomUUID()}.${ext}`;
  const contentType = (file as File).type || "image/jpeg";

  await c.env.VIDEOS.put(key, (file as File).stream(), { httpMetadata: { contentType } });

  // Delete any existing asset for this shot
  await c.env.DB.prepare("DELETE FROM CommercialAsset WHERE projectId = ? AND shotId = ?").bind(projectId, shotId).run();

  const assetId = `asset_${crypto.randomUUID()}`;
  const url = new URL(`/api/video/${key}`, c.req.url).toString();
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    "INSERT INTO CommercialAsset (id,projectId,shotId,url,originalName,mimeType,sizeBytes,notes,createdAt) VALUES (?,?,?,?,?,?,?,?,?)"
  ).bind(assetId, projectId, shotId, url, (file as File).name || key, contentType, (file as File).size ?? 0, notes, now).run();

  // Update project status
  const { results: allShots } = await c.env.DB.prepare(
    "SELECT id FROM CommercialTemplateShot WHERE templateId = ? AND required = 1"
  ).bind(project.templateId).all<{ id: string }>();
  const { results: uploadedAssets } = await c.env.DB.prepare(
    "SELECT shotId FROM CommercialAsset WHERE projectId = ?"
  ).bind(projectId).all<{ shotId: string }>();
  const uploadedShotIds = new Set((uploadedAssets ?? []).map((a) => a.shotId));
  const allRequired = (allShots ?? []).every((s) => uploadedShotIds.has(s.id));
  const newStatus = allRequired ? "ready_for_generation" : "uploading";
  await c.env.DB.prepare("UPDATE CommercialProject SET status = ?, updatedAt = ? WHERE id = ?")
    .bind(newStatus, new Date().toISOString(), projectId).run();

  const asset = await c.env.DB.prepare("SELECT * FROM CommercialAsset WHERE id = ?").bind(assetId).first<DbAsset>();
  return c.json({ data: asset }, 201);
});

commercialsRouter.delete("/projects/:id/assets/:assetId", async (c) => {
  const user = requireAuth(c);
  const { id: projectId, assetId } = c.req.param();

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(projectId).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  await c.env.DB.prepare("DELETE FROM CommercialAsset WHERE id = ? AND projectId = ?").bind(assetId, projectId).run();

  const { results: uploadedAssets } = await c.env.DB.prepare(
    "SELECT shotId FROM CommercialAsset WHERE projectId = ?"
  ).bind(projectId).all<{ shotId: string }>();
  const newStatus = (uploadedAssets ?? []).length === 0 ? "draft" : "uploading";
  await c.env.DB.prepare("UPDATE CommercialProject SET status = ?, updatedAt = ? WHERE id = ?")
    .bind(newStatus, new Date().toISOString(), projectId).run();

  return c.json({ data: { success: true } });
});

// ---------------------------------------------------------------------------
// Generate video plan
// ---------------------------------------------------------------------------

commercialsRouter.post("/projects/:id/generate", async (c) => {
  const user = requireAuth(c);
  const projectId = c.req.param("id");

  const project = await c.env.DB.prepare("SELECT * FROM CommercialProject WHERE id = ?").bind(projectId).first<DbProject>();
  if (!project) return c.json({ error: { message: "Not found" } }, 404);

  const member = await c.env.DB.prepare("SELECT id FROM OrgMember WHERE userId = ? AND organizationId = ?")
    .bind(user.id, project.organizationId).first();
  if (!member) return c.json({ error: { message: "Forbidden" } }, 403);

  const template = await c.env.DB.prepare("SELECT * FROM CommercialTemplate WHERE id = ?").bind(project.templateId).first<DbTemplate>();
  if (!template) return c.json({ error: { message: "Template not found" } }, 400);

  const { results: shots } = await c.env.DB.prepare(
    'SELECT * FROM CommercialTemplateShot WHERE templateId = ? ORDER BY "order" ASC'
  ).bind(project.templateId).all<DbShot>();
  const { results: assets } = await c.env.DB.prepare(
    "SELECT * FROM CommercialAsset WHERE projectId = ? ORDER BY createdAt ASC"
  ).bind(projectId).all<DbAsset>();

  const plan = buildVideoPlan(project, template, shots ?? [], assets ?? []);
  const planId = `plan_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    `INSERT INTO CommercialVideoPlan (id,projectId,planJson,status,createdAt,updatedAt) VALUES (?,?,?,'ready',?,?)
     ON CONFLICT(projectId) DO UPDATE SET planJson=excluded.planJson, updatedAt=excluded.updatedAt`
  ).bind(planId, projectId, JSON.stringify(plan), now, now).run();

  await c.env.DB.prepare("UPDATE CommercialProject SET status='complete', updatedAt=? WHERE id=?")
    .bind(now, projectId).run();

  return c.json({ data: plan });
});

export { commercialsRouter };
