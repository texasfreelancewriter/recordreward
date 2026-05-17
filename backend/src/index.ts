import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env, AppVariables } from "./env";
import { createAuth } from "./auth";
import { sampleRouter } from "./routes/sample";
import { interviewsRouter } from "./routes/interviews";
import { adminRouter } from "./routes/admin";
import { kioskConfigRouter } from "./routes/kiosk-config";
import { organizationsRouter } from "./routes/organizations";
import { publicKioskRouter } from "./routes/public-kiosk";
import { invitesRouter } from "./routes/invites";
import { commercialsRouter } from "./routes/commercials";

const app = new Hono<{ Bindings: Env; Variables: AppVariables }>();

app.onError((err, c) => {
  console.error("[error]", err);
  return c.json({ error: { message: err.message, stack: err.stack } }, 500);
});

const allowedOrigins = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/[a-z0-9-]+\.dev\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.run$/,
  /^https:\/\/[a-z0-9-]+\.vibecodeapp\.com$/,
  /^https:\/\/[a-z0-9-]+\.vibecode\.dev$/,
  /^https:\/\/vibecode\.dev$/,
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/,
  /^https:\/\/[a-z0-9-]+\.workers\.dev$/,
  /^https:\/\/recordreward\.com$/,
  /^https:\/\/www\.recordreward\.com$/,
  /^https:\/\/app\.recordreward\.com$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && allowedOrigins.some((re) => re.test(origin)) ? origin : null,
    credentials: true,
  })
);

app.use("*", logger());

// Auth middleware — populates user/session for all routes
app.use("*", async (c, next) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

app.get("/health", (c) => c.json({ status: "ok" }));

// Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Current user
app.get("/api/me", (c) => {
  const user = c.get("user");
  if (!user) return c.body(null, 401);
  return c.json({ data: user });
});

// Image upload — stores in R2, returns a Worker-proxied URL
app.post("/api/upload/image", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as unknown as File | string | null;

  if (!file || typeof file === "string") {
    return c.json({ error: { message: "No file provided", code: "NO_FILE" } }, 400);
  }

  try {
    const ext = (file as File).name?.split(".").pop() ?? "jpg";
    const key = `img-${crypto.randomUUID()}.${ext}`;
    const contentType = (file as File).type || "image/jpeg";

    await c.env.VIDEOS.put(key, (file as File).stream(), {
      httpMetadata: { contentType },
    });

    const imageUrl = new URL(`/api/video/${key}`, c.req.url).toString();

    return c.json({
      data: {
        id: key,
        url: imageUrl,
        filename: (file as File).name || key,
        contentType,
        sizeBytes: (file as File).size ?? 0,
      },
    });
  } catch (err) {
    console.error("[r2] Image upload error:", err);
    return c.json(
      { error: { message: "Image upload failed", code: "UPLOAD_FAILED" } },
      500
    );
  }
});

// Video upload — stores in R2, returns a Worker-proxied URL
app.post("/api/upload/video", async (c) => {
  const formData = await c.req.formData();
  // Workers FormData.get() types as string | null, but multipart uploads are File at runtime
  const file = formData.get("file") as unknown as File | string | null;

  if (!file || typeof file === "string") {
    return c.json({ error: { message: "No file provided", code: "NO_FILE" } }, 400);
  }

  try {
    const ext = (file as File).name?.split(".").pop() ?? "webm";
    const key = `${crypto.randomUUID()}.${ext}`;
    const contentType = (file as File).type || "video/webm";

    await c.env.VIDEOS.put(key, (file as File).stream(), {
      httpMetadata: { contentType },
    });

    // Build URL relative to this request so it works in both dev and prod
    const videoUrl = new URL(`/api/video/${key}`, c.req.url).toString();

    return c.json({
      data: {
        id: key,
        url: videoUrl,
        filename: (file as File).name || key,
        contentType,
        sizeBytes: (file as File).size ?? 0,
      },
    });
  } catch (err) {
    console.error("[r2] Upload error:", err);
    return c.json(
      { error: { message: "Video upload failed", code: "UPLOAD_FAILED" } },
      500
    );
  }
});

// Video serve — proxies R2 object with range request support for seeking
app.get("/api/video/:key", async (c) => {
  const key = c.req.param("key");
  const rangeHeader = c.req.header("Range");

  let r2Options: R2GetOptions = {};
  if (rangeHeader) {
    const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? parseInt(match[1]) : undefined;
      const end = match[2] ? parseInt(match[2]) : undefined;
      if (start !== undefined) {
        r2Options = {
          range: {
            offset: start,
            length: end !== undefined ? end - start + 1 : undefined,
          },
        };
      }
    }
  }

  const object = await c.env.VIDEOS.get(key, r2Options);
  if (!object) {
    return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  if (rangeHeader && "range" in object && object.range && "offset" in object.range) {
    const { offset, length } = object.range as { offset: number; length?: number };
    const end = length !== undefined ? offset + length - 1 : object.size - 1;
    headers.set("Content-Range", `bytes ${offset}-${end}/${object.size}`);
    headers.set("Content-Length", String(end - offset + 1));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(object.size));
  return new Response(object.body, { status: 200, headers });
});

// Download proxy
app.get("/api/download", async (c) => {
  const url = c.req.query("url");
  const filename = c.req.query("filename") || "download";

  if (!url) {
    return c.json({ error: { message: "URL required", code: "NO_URL" } }, 400);
  }

  const response = await fetch(url);
  if (!response.ok) {
    return c.json({ error: { message: "Failed to fetch file", code: "FETCH_FAILED" } }, 502);
  }

  const buffer = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
});

app.route("/api/sample", sampleRouter);
app.route("/api/interviews", interviewsRouter);
app.route("/api/admin", adminRouter);
app.route("/api/kiosk-config", kioskConfigRouter);
app.route("/api/organizations", organizationsRouter);
app.route("/api/public/kiosk", publicKioskRouter);
app.route("/api/invites", invitesRouter);
app.route("/api/commercials", commercialsRouter);

export default app;
